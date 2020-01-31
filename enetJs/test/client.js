/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const ActiveHandles = require('why-is-node-running') // should be your first require
const Discovery = require('@hyperswarm/discovery');
const ENet = require('enet');
const { performance } = require('perf_hooks');

class UDPConnection  {
	constructor(peer) {
		this.onConnected(peer);
	}
	onConnected(peer) {
		this.peer = peer;
		peer.once("disconnect", () => this.reconnect()); // whenever disconnected, establish a new connection again
		this.nReconnectAttempt = 0; // reset the counter		
	}
	reconnect() {
		if (this.closed) return false;
		const { address: host, port } = this.peer.address();
		this.peer._host.connect(address, 1/* channel */, 0, (err, peer) => {
			if (err) {
				this.reconnectTimer = setTimeout(() => this.reconnect(), ++this.nReconnectAttempt * 1000);
			} else
				this.onConnected(peer);
		});
	}
	close() {
		this.closed = true;
		this.peer.disconnectNow();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}
	send(data, cb) {
		process.nextTick(() => this.peer._host._service()); // force event loop once (since we use larger wait poll)
		return this.peer.send(0 /*channel*/, data, cb);
	}
	request(method, params, timeout, cb) {
		const id = (Math.random() * Date.now()).toString();
		if (this.send({ jsonrpc: "2.0", method, params, id }, cb)) return false; // send failed
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
				client.start(500); // poll at 500ms
				resolve(new UDPClient(client));
			});
		});
	}
	connectTo({ host, port }, channels = 1, data = 0) {
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
					this.connectReqs[connString] = null; 
					return reject(err);
				}
				// successfully connected, keep the promise in this.connectReqs{} and resolve it
				return resolve(new UDPConnection(peer));
			});
		});
	}
	close() {
		this.client.destroy();
		this.client = null;
	}
};

const udpClient = UDPClient.create();

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
	}
	addConnection(targetKey, conn) {
		const oldConn = this.connections[targetKey];
		if (oldConn) oldConn.close();
		this.connections[targetKey] = conn;
	}
	getConnection(targetKey) {
		const conn = this.connection[targetKey];
		if (conn & conn.state()) return conn;
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
		const index = keyRejections.findIndex(peer => peer.host == host && peer.port == port);
		return index < 0 ? false : true;
	}
}

class LocatorMetricsNone extends ConnectionManager {
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
	isPeerValid(peerInfo, targetKey) {
		// 1. check if duplicate (pending validation / ongoing validation)
		// 2. check if previously validated
		// 3. connect and ask if it is valid
		return this.isPeerBlacklisted(peerInfo).then(blacklisted => {
			if (blacklisted || this.hasPeerBeenRejected(peerInfo)) return null;
			// peer was not blacklisted, nor rejected earlier for this key;
			// connect to it and validate the public key
			return udpClient.connectTo(peerInfo).then(conn => {

			}).catch(err => null);
		});
	}
	recordEntry(targetKey, conn, timeSpent) {
		this.addConnection(targetKey, conn);
		// TODO:
		// 1. add referrer to bootstrap nodes
		// 2. save the { targetKey -> peer } mapping, along with the current timestamp (last accessed)
		// 3. save the timeSpent performance metric
	}
	close() {
		super.close();
		// TODO: shutdown any database connections and cleanup the resources
	}
};

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
		return this.metrics.isReferrerBlacklisted(peerInfo.referrer).then(referrerBlacklisted => {
			const connString = peerInfo.host + ":" + peerInfo.port;
			if (referrerBlacklisted || this.candidates[connString]) return false; // ignore duplicates
			this.candidates[connString] = {};
			return this.metrics.isPeerValid(peerInfo, targetKey).then(connection => {
				if (!connection) return false;
				this.finish(connection);
				this.metrics.recordEntry(targetKey, connection, this.timeSpent());
				return true; // found a peer, finally
			});
		});
	}
}

class HyperDiscoveryLookup {
	constructor(d, targetKey, timeout, tracker) {
		this.nRetryAttempt = 0;
		this.topic = d.lookup(targetKey);
		this.topic.on('peer', peer => tracker.onPeer(peer)); // we do NOT consider timeouts while peers are being listed
		this.topic.on('update', () => {
			if (!tracker.isInProgress()) return;
			// tracker is running, but discovery is complete - this means lookup failed. Try again or cancel
			const waitPeriod = 5000 * ++this.nRetryAttempt;
			if (tracker.timeSpent() + waitPeriod >= timeout)
				tracker.cancel(new Error(`Timeout - lookup did not find any results in ${timeout}ms`));
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
		locatorMetrics = new LocatorMetricsNone() } = {})
	{
		return locatorMetrics.getBootstrapServers(bootstrap).then(bootstrap => 
			new Locator(Discovery({ ephemeral, bootstrap }), locatorMetrics)
		);
	}
	findOwner(pubKey, timeout = 30000) {
		if (!pubKey || typeof pubKey !== "string")
			throw new Error("pubKey should be a base64 encoded publicKey string");
		
		// check if an active connection already exists to the owner of the target.
		// This conn was recorded in the connection manager the last time the search was successful (LookupTracker::onPeer method).
		const conn = this.metrics.getConnection(targetKey);
		if (conn) return Promise.resolve(conn);
		
		// if a search going on for the same key, return that promise.
		// On success the promise resolves to an active connection to the owner, also
		// gets recorded into the connection manager (LookupTracker::onPeer method).
		const activeTracker = this.activeTrackers[pubKey];
		if (activeTracker && activeTracker.isInProgress()) return activeTracker.p;
		
		const tracker = this.activeTrackers[pubKey] = new LookupTracker(pubKey, this.metrics);
		const hdLookup = new HyperDiscoveryLookup(this.disco, pubKey, timeout, tracker); // TODO: add other discovery lookups here
		// TODO: in parallel lookup the metrics database to connect last known IP for the owner (use the same tracker)
		//	1. read the last known ip from the DB, and use tracker.onPeer(<ip>)
		//		 if the ip resolves, then it will call finish() and stops all the searches for it

		return tracker.p.finally(() => { this.activeTrackers[pubKey] = null; });
	}
	close() {
		this.disco.destroy();
		this.disco = null;
		this.metrics.close();
		this.metrics = null;
	}
	invoke(didMethod, params, cb) {
		// 1. get targetKey and methodName from didMethod
		const targetKey = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");
		const methodName = ".disco";
		// get a connection to the owner of the key
		return this.findOwner(targetKey, tracker).then(connection => {
			// make RPC call on the connection and return the ID
			
			// returns the id of RPC call
		});
	}
}

const targetKey = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");

Locator.create().then(l => {
	l.findOwner(targetKey, 90000).then(console.log).catch(console.log).finally(() => l.close());
});