/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
// const ActiveHandles = require('why-is-node-running') // should be your first require
const Discovery = require('@hyperswarm/discovery');
const ENet = require('enet');
const Errors = require('@feathersjs/errors'); // TODO: replace with { Errors } = require('@fict/core')
const EventEmitter = require('events');
const MultiBase = require('multibase');
const PriorityQ = require('fastpriorityqueue');
const { performance } = require('perf_hooks');
const WebSocket = require('ws');

class Tracker {
	constructor() {
		this.p = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
		this.finished = this.cancelled = false;
		this.tStart = performance.now();
	}
	finish(result) {
		if (this.isInProgress() == false) return;
		this.tEnd = performance.now();
		this.finished = true;
		this.resolve(result);
	}
	cancel(reason) {
		if (this.isInProgress() == false) return;
		this.tEnd = performance.now();
		this.cancelled = true;
		this.reject(reason);
	}
	isInProgress() {
		return !this.finished && !this.cancelled;
	}
	timeSpent() {
		return (this.tEnd ? this.tEnd : performance.now()) - this.tStart;
	}
};


class TimeBoundTrackers extends PriorityQ {
	constructor(cleanUpIntervalMS = 1000) {
		super((a, b) => a.expiresAt < b.expiresAt);
		this.cleanUpTimer = setInterval(() => {
			let el = this.peek();
			while (el && el.expiresAt <= performance.now()) {
				this.poll(); // remove the top element; (so that in the cancel's callback below, caller cannot remove it again)
				el.tracker.cancel(new Errors.Timeout(`Timeout`));
				el = this.peek();
			}
		}, cleanUpIntervalMS);
	}
	close() {
		if (this.cleanUpTimer) { console.log("cleaning up timer expiry invertal")
			clearInterval(this.cleanUpTimer);
			this.cleanUpTimer = null;
		}
	}
};
// TODO: close() this when ??
const gRPCRequestExpiryQ = new TimeBoundTrackers(); // Only use this in conjunction with RPCRequestTracker::setExpiry(); Do not mix different tracker types.

class UDPConnection extends EventEmitter  {
	constructor(peer) {
		this.peer = peer;
		peer.once("disconnect", () => this.close()); // whenever disconnected, close the connection
		peer.on("message", (packet, channel) => this.onMessage(packet, channel));
		/*
			we do not try to reconnect inside here, for two reasons:
				1. when reconnection happens we have to verify the publicKey again to ensure 
					the host is still valid. It is possible that ip-address was assigned to some other
					machine during the reconnect trials, and we do not want to just reconnect and pretend
					the machine is valid. The problem is, in this class we do not have access to the
					publicKey for which this connection is made. Besides, it is possible that this
					same connection is being used for multiple publicKeys (targetKey->conn mapping inside ConnectionManager).
				2. the peers could be just roaming around and the host may move into a different
					subnet. Trying to reconnect to the same old ip would not make sense. Before disconnecting,
					the peer may indicate a "future ip", which the LocatorMetrics can keep track of and
					connect to when a new findOwner() lookup is called. Else, for stable hosts the LocatorMetrics
					keeps track of "recent know ip" addresses, and tries them during the findOwner() lookups.

			For these reasons, we move the reconnection to the Locator, where it determines (based on 
				the pending no.of RPCs etc.) if reconnection should be made or not. The flow
				there takes care of validating the peer, as well as deciding the best "known" ip or 
				"future" ip or just discover afresh.
		*/
	}
	close() {
		if (this.closed) return;
		this.closed = true;
		this.peer.disconnectNow();
		this.emit("closed");
	}
	isActive() {
		if (this.closed) return 0;
		return this.peer.state() == ENet.PEER_STATE.CONNECTED;
	}
	send(data, cb) {
		console.log("seding data: ", data);
		process.nextTick(() => this.peer._host._service()); // force event loop once (since we use larger wait poll)
		return this.peer.send(0 /*channel*/, data, cb);
	}
	/**
	 * @returns a tracker that allows cancel() of the request. It holds a promise
	 * that resolves when the request has a response, and rejects when an error happens 
	 * or timeout is reached.
	 */
	request(method, params, timeoutMS = 5000) {
		return new Promise((resolve, reject) => {
			const tracker = new RPCRequestTracker({ jsonrpc: "2.0", method, params });
			this.send(tracker.req(), (err, sendResult) => {
				if (err) return reject(err); // send failed
				// send queued, now caller can wait on tracker.p<> promise to resolve for result;
				// Also tracker.p<> rejects with TIMEOUT error if timeout is specified (0 disables the timeout)
				if (timeoutMS) tracker.setExpiry(timeoutMS, gRPCRequestExpiryQ);
				resolve(tracker);
			});
		});
	}
	onMessage(pkt, _channel) {
		console.log("message received: ", pkt);
		process.nextTick(() => this.peer._host._service()); // force event loop once (since we use larger wait poll)
	}
};

class RPCRequestTracker extends Tracker {
	constructor(req) {
		super();
		this._req = req;
		this._req.id = (Math.random() * this.tStart).toString();
	}
	setExpiry(timeoutMS, expiryQ) {
		expiryQ.add({ expiresAt: this.tStart + timeoutMS, tracker: this });
		this.p.then(() => expiryQ.removeOne(el => el.tracker._req.id == this._req.id)); // if it is finished, remove from the timeout-queue
		this.p.catch(err => {
			// if it is time-expired, see if we have to retry again (no need to remove from queue explicitly)
		});
	}
	get req() { return this._req }
	finish() {
		throw new Errors.MethodNotAllowed(`RPCRequestTracker.Finish() can not be called directly !!`);
	}
};

class UDPClient {
	constructor(eNetClient) {
		this.client = eNetClient;
		this.connectReqs = {}; // successful or in-progress requests till now; Maps {<hostname:port> -> Promise<connection>}
	}
	/**
	 * Creates a Client instance
	 * @param {integer} maxPeers - no. of maximum simultaneous servers this client can connect at a time
	 * @param {integer} maxChannels - no. of total channels available for the peers
	 */
	static create(maxPeers = 32, maxChannels = 64) {
		return new Promise((resolve, reject) => {
			ENet.createClient({ peers: maxPeers, channels: maxChannels, down: 0, up: 0 }, (err, client) => {
				if (err) return reject(err);
				//client.start(500); // poll at 500ms
				resolve(new UDPClient(client));
			});
		});
	}
	connectTo({ host, port }, channels = 1, data = 0) {
		if (!this.client) return Promise.reject(new Error(`connectTo[${host}:${port}]: UDPClient not active`));
		const connString = `${host}:${port}`;
		// if a previously resolved, or in-progress request is available, return it;
		// This way, we do not create multiple connections to the same <host:port>;
		const req = this.connectReqs[connString];
		if (req) return req;
		// Either no previous attempt was made, or previous attempt failed (hence promise removed from the q);
		// make a fresh request (again)
		return this.connectReqs[connString] = new Promise((resolve, reject) => {
			this.client.connect(new ENet.Address(host, port), channels, data, (err, peer) => {
				if (err) {
					// remove it so that next time fresh connection attempt can be made again
					delete this.connectReqs[connString]; 
					return reject(err);
				}
				// successfully connected, keep the promise in this.connectReqs{} and resolve it;
				// we only cache the promises here, the actual connections are held in ConnectionManager.
				const conn = new UDPConnection(peer);
				conn.once("closed", () => delete this.connectReqs[connString]);
				return resolve(conn);
			});
		});
	}
	close() {
		if (this.client) {
			this.client.destroy(); // will in turn destroy all peers and emits 'disconnect' on each of them which invokes UDPConnection::close() for each
			this.client = null;
		}
	}
};


const DISCO_BOOTSTRAP = [
	'bootstrap1.hyperdht.org:49737',
	'bootstrap2.hyperdht.org:49737',
	'bootstrap3.hyperdht.org:49737'
];

class ConnectionManager {
	constructor() {
		// current active connections for each targetKey. Maps { targetKey -> one connection }
		this.connections = {}; // peers validated successfully
		// current rejections for each targetKey. Maps { targetKey -> [] of rejected {host, port} objects }
		this.rejections = {}; // peers connected but validation failed (could go into blacklist)
		// TODO: somehow cleanup closed connections !! Should we handle the "closed" event?
	}
	addConnection(targetKey, conn) {
		const oldConn = this.connections[targetKey];
		if (oldConn) oldConn.close();
		this.connections[targetKey] = conn;
	}
	getConnection(targetKey) {
		const conn = this.connections[targetKey];
		if (conn && conn.isActive()) return conn;
		return null;
	}
	close() {
		Object.keys(this.connections).forEach(key => this.connections[key].close());
		this.connections = {};
	}
	addRejection(peerInfo, targetKey) {
		if (!this.rejections[targetKey]) this.rejections[targetKey] = [];
		this.rejections[targetKey].push(peerInfo);
	}
	hasPeerBeenRejected({ host, port, local }, targetKey) {
		const keyRejections = this.rejections[targetKey];
		if(!keyRejections) return false;
		const index = keyRejections.findIndex(peer => peer.host == host && peer.port == port);
		return index < 0 ? false : true;
	}
}

class LocatorMetrics extends ConnectionManager {
	constructor(rpcClientHost) {
		super();
		this.rpcClientHost = rpcClientHost;
	}
	static start(opt) {
		return UDPClient.create().then(udpClient => new LocatorMetrics(udpClient));
	}
	close() {
		super.close();
		if (this.rpcClientHost) {
			this.rpcClientHost.close();
			this.rpcClientHost = null;
		}
		// TODO: shutdown any database connections and cleanup the resources
	}

	getBootstrapServers(def = [] ) {
		return Promise.resolve(def);
	}
	/**
	 * @returns true if referrer is blacklisted
	 * Implementation Notes: Referrers may be holding old data on DHT. 
	 * 	They cannot be blacklisted purely based on their wrong/old entries.
	 *  They may be ranked based on their no. of correct answers and restrict
	 *  only those above certain minimum rank to be considered for referrals.
	 *  By default, all new/unknown hosts should be given the minimum rank to start with. 
	 *  As time progresses, the ranks may be refined to reflect the reality.
	 */
	isReferrerBlacklisted(referrer) {
		return Promise.resolve(false);
	}
	/**
	 * @returns true if the peer was blacklisted earlier
	 * Peers can be blacklisted based on their previous failures to validate
	 * the target keys that they announced.
	 * Peer not being online or not connectable to verify, is not good enough reason
	 * to blacklist it. Peers may come online and go away while roaming.
	 * Blacklisting is a serious business that is targeted at peers that are 
	 * online but announce wrong results (crypto verification fails).
	 */
	isPeerBlacklisted({ port, host, local, referrer }) {
		// TODO: check if blacklisted as per database. This does NOT include
		// active rejections in this session for a particular key. 
		// Blacklists are irrespective of target key. They are blanket rejections
		// based on IP or CIDR.  Rejections are specific to a key (and 
		// other keys might have worked for the same host!!). We do NOT check
		// rejections specific to a key here.
		return local ? Promise.reject(true) : Promise.resolve(false);
	}
	/**
	 * Verifies if the peer is valid owner of the said targetKey.
	 */
	isPeerValid(peerInfo, targetKey, lookupTracker) {
		// 1. check if duplicate (pending validation / ongoing validation)
		// 2. check if previously validated
		// 3. connect and ask if it is valid
		return this.isPeerBlacklisted(peerInfo).then(blacklisted => {
			if (blacklisted || this.hasPeerBeenRejected(peerInfo) || !lookupTracker.isInProgress()) return null;
			console.log(`validating peer ${peerInfo.host}:${peerInfo.port} for key: ${targetKey}`, peerInfo);
			// peer was not blacklisted, nor rejected earlier for this key;
			// connect to it and validate the public key

			const ws = new WebSocket(`ws://${peerInfo.host}:${peerInfo.port}`, {
				perMessageDeflate: false
			});
			ws.on("open", () => ws.send("something"));
			ws.on("message", data => console.log("received:", data));

			return;
			return this.rpcClientHost.connectTo(peerInfo).then(conn => {  console.log("connected to peer")
				if (!lookupTracker.isInProgress()) return null;
				const reqTracker = conn.request("proveAuth", { targetKey });
				if (!reqTracker) return null;
				// whenever the lookup query that called us got cancelled or fulfilled, stop further processing
				lookupTracker.p.finally(() => reqTracker.cancel(new Errors.Timeout(`peer validation cancelled due to lookup tracker finalization`, { peerInfo, targetKey })));
				// we issued a auth request for the remote peer, wait for the response
				return reqTracker.p.then(response => {
					if (!response) { conn.close(); return null; }
					
					// TODO: if not valid response, add to rejected list, close the connection and return null

					return conn; // alright, seems the peer is valid
				}).catch(err => { conn.close(); return null; }); // RPC might have timed out, or some other error. Just consider as auth failure
			});
		}).catch(err => null);
	}
	recordEntry(targetKey, conn, timeSpent) {
		// TODO: for first connect, for UDPClient, setup client.start(500); // poll at 500ms
		this.addConnection(targetKey, conn);
		// TODO:
		// 1. add referrer to bootstrap nodes
		// 2. save the { targetKey -> peer } mapping, along with the current timestamp (last accessed)
		// 3. save the timeSpent performance metric
	}
};

class LookupTracker extends Tracker {
	constructor(targetKey, metrics) {
		super();
		this.targetKey = targetKey;
		this.metrics = metrics;
		this.candidates = {}; // TODO: how about trie?
	}
	// returns true if peer is found / search cancelled
	onPeer(peerInfo) {
		if (this.isInProgress() == false) return Promise.resolve(true);
		const connString = peerInfo.host + ":" + peerInfo.port;
		if (this.candidates[connString]) return Promise.resolve(false);  // ignore duplicates (no matter who referred)	
		return this.metrics.isReferrerBlacklisted(peerInfo.referrer).then(referrerBlacklisted => {
			if (referrerBlacklisted) return false;
			this.candidates[connString] = {}; // add to "seen" list (to ignore duplicates)
			return this.metrics.isPeerValid(peerInfo, this.targetKey, this).then(connection => {
				if (!connection) return false;
				this.finish(connection);
				this.metrics.recordEntry(ths.targetKey, connection, this.timeSpent());
				return true; // found a peer, finally
			});
		});
	}
}

class HyperDiscoveryLookup {
	constructor(d, targetKey, timeout, tracker) {
		this.nRetryAttempt = 0; console.log("HyperDiscoveryLookup.targetKey: ", targetKey, " buf: ", MultiBase.decode(targetKey));
		this.topic = d.lookup(MultiBase.decode(targetKey));
		this.topic.on('peer', peer => tracker.onPeer(peer)); // we do NOT consider timeouts while peers are being listed
		this.topic.on('update', () => {
			if (!tracker.isInProgress()) return;
			// tracker is running, but discovery is complete - this means lookup failed. Try again or cancel
			const waitPeriod = 5000 * ++this.nRetryAttempt;
			if (tracker.timeSpent() + waitPeriod >= timeout)
				tracker.cancel(new Errors.Timeout(`Lookup did not find any results in ${timeout}ms for ${targetKey}`, { targetKey, timeout }));
			else
				this.retryTimer = setTimeout(() => this.topic.update(), waitPeriod);
		});
		// whenever tracker completes / cancels, stop the discovery
		tracker.p.finally(() => this.close());
	}
	close() {
		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}		
		if (this.topic) {
			this.topic.destroy();
			this.topic = null;
		}
	}
}

class Locator {
	constructor(d, m) {
		this.disco = d;
		this.metrics = m;
		this.activeTrackers = {};
	}
	static create({
		ephemeral = true,
		bootstrap = DISCO_BOOTSTRAP,
		opts = {} } = {})
	{
		return LocatorMetrics.start(opts).then(locatorMetrics => 
			locatorMetrics.getBootstrapServers(bootstrap).then(bootstrap =>
				new Locator(Discovery({ ephemeral, bootstrap }), locatorMetrics)));
	}
	findOwner(pubKey, timeout = 300000) {
		if (!pubKey || typeof pubKey !== "string" || !pubKey.length || !MultiBase.isEncoded(pubKey))
			return Promise.reject(new Errors.BadRequest("pubKey should be a valid MultiBase encoded publicKey string", { pubKey }));
		
		// check if an active connection already exists to the owner of the target.
		// This conn was recorded in the connection manager the last time the search was successful (LookupTracker::onPeer method).
		const conn = this.metrics.getConnection(pubKey);
		if (conn) return Promise.resolve(conn);
		
		// if a search going on for the same key, return that promise.
		// On success the promise resolves to an active connection to the owner, also
		// gets recorded into the connection manager (LookupTracker::onPeer method).
		const activeTracker = this.activeTrackers[pubKey];
		if (activeTracker && activeTracker.isInProgress()) return activeTracker.p;

		// this.disco.holepunch({
		// 	port: 12345,
		// 	host: '103.240.207.189',
		// 	local: false,
		// 	referrer: {
		// 		port: 45922,
		// 		host: '88.99.3.86'
		// 	}
		// }, (err, response) => {
		// 		console.log("holepunch err: ", err);
		// 		console.log("holepunch reponse: ", response);
		// });
		
		const tracker = this.activeTrackers[pubKey] = new LookupTracker(pubKey, this.metrics);
		const hdLookup = new HyperDiscoveryLookup(this.disco, pubKey, timeout, tracker); // TODO: add other discovery lookups here
		// TODO: in parallel lookup the metrics database to connect last known IP for the owner (use the same tracker)
		//	1. read the last known ips from the DB, and use tracker.onPeer(<ip>) on each of them
		//		 if the ip resolves, then it will call finish() and stops all the searches for it
		//	2. also check if any "future" ip was mentioned by peer (before last disconnect), and try that as well.

		return tracker.p.finally(() => { delete this.activeTrackers[pubKey]; });
	}
	close() {
		if (this.activeTrackers) {
			Object.keys(this.activeTrackers).forEach(key => this.activeTrackers[key].cancel(`Locator.close()`));
			this.activeTrackers = null;			
		}
		if (this.disco) {
			this.disco.destroy();
			this.disco = null;
		}
		if (this.metrics)
		{
			this.metrics.close();
			this.metrics = null;			
		}
	}
	invoke(didMethod, params, cb) {
		// 1. get targetKey and methodName from didMethod
		const targetKey = MultiBase.encode("base64", Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex")).toString();
		const methodName = ".disco";		
		// get a connection to the owner of the key
		return this.findOwner(targetKey)
			.then(conn => conn.request("method", { param1: "dingbat" }))	// make RPC call on the connection and return the ID
			.then(reqTracker => { console.log("tracker: ", reqTracker); return reqTracker.p; })
			.then(response => console.log("response: ", response))
			.catch(err => {
				console.log("invoke error: ", err);
			});
	}
}

Locator.create().then(async l => {	
	l.invoke().then(console.log).catch(console.log).finally(() => {
		gRPCRequestExpiryQ.close();
		l.close();
		//setTimeout(() => setImmediate(() => ActiveHandles()), 0);
	});
});


process.on('unhandledRejection', (reason, _p) =>
	console.error(`Unhandled Rejection ${reason.stack}`)
);
