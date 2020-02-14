/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
// const ActiveHandles = require('why-is-node-running') // should be your first require
const Errors = require('@feathersjs/errors'); // TODO: replace with { Errors } = require('@fict/core')
const EventEmitter = require('events');
const HyperSwarmNetwork = require('@hyperswarm/network');
const MultiBase = require('multibase');
const PriorityQ = require('fastpriorityqueue');
const { performance } = require('perf_hooks');

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

function clearExpired(tbtQ) {
	let el = tbtQ.peek();
	while (el && el.expiresAt <= performance.now()) {
		tbtQ.poll(); // remove the top element;
		el.tracker.cancel(new Errors.Timeout(`Timeout`));
		el = tbtQ.peek();
	}
}

class TimeBoundTrackers extends PriorityQ {
	constructor(cleanUpIntervalMS = 1000, cleanupFn = clearExpired) {
		super((a, b) => a.expiresAt < b.expiresAt);
		this.cleanUpTimer = setInterval(cleanupFn, cleanUpIntervalMS, this);
	}
	close() {
		if (this.cleanUpTimer) {
			clearInterval(this.cleanUpTimer);
			this.cleanUpTimer = null;
		}
	}
};
// TODO: close() this when ??
const gRPCRequestExpiryQ = new TimeBoundTrackers(); // Only use this in conjunction with RPCRequestTracker::setExpiry(); Do not mix different tracker types.


class RPCRequestTracker extends Tracker {
	constructor(req) {
		super();
		this._req = req;
		this._req.id = req.id || (Math.random() * this.tStart).toString();
	}
	setExpiry(timeoutMS, expiryQ) {
		const equalityFn = el => el.tracker._req.id == this._req.id;
		expiryQ.removeOne(equalityFn);
		expiryQ.add({ expiresAt: this.tStart + timeoutMS, tracker: this });
		this.p.finally(() => expiryQ.removeOne(equalityFn)); // finished or cancelled, remove from the timeout-queue (if exists)
	}
	get req() { return this._req }
	finish() {
		throw new Errors.MethodNotAllowed(`RPCRequestTracker.Finish() can not be called directly !!`);
	}
	abort(reason) { // TODO: we only abort successful requests that server returned an abort handle for async results
		if (!this.isInProgress()) return;
		this.conn.send(`{ "jsonrpc": "2.0", "method": ".abort", "params": { "id": "<abort handle received from server>" } }`, err => { /* send error */ });
		super.cancel(reason);
	}
};


const DISCO_BOOTSTRAP = [
	'bootstrap1.hyperdht.org:49737',
	'bootstrap2.hyperdht.org:49737',
	'bootstrap3.hyperdht.org:49737'
];

class ConnectionManager extends EventEmitter {
	constructor() {
		super();
		// current active connections for each targetKey. Maps { targetKey -> one connection }
		this.connections = new Map(); // peers validated successfully
		// current rejections for each targetKey. Maps { targetKey -> [] of rejected {host, port} objects }
		this.rejections = new Map(); // peers connected but validation failed (could go into blacklist)
	}
	addConnection(targetKey, conn) {
		const oldConn = this.connections.get(targetKey);
		if (oldConn) oldConn.close();
		this.connections.set(targetKey, conn);
		conn.once("closed", () => this.connections.delete(targetKey));
	}
	getConnection(targetKey) {
		const conn = this.connections.get(targetKey);
		if (conn && conn.isActive()) return conn;
		return null;
	}
	close() {
		for (let conn of this.connections.values())
			conn.close();
		this.connections.clear();
		this.rejections.clear();
	}
	addRejection(peerInfo, targetKey) {
		if (!this.rejections.has(targetKey)) this.rejections.set(targetKey, []);
		this.rejections.get(targetKey).push(peerInfo);
	}
	hasPeerBeenRejected({ host, port, local }, targetKey) {
		const keyRejections = this.rejections.get(targetKey);
		if (!keyRejections) return false;
		const index = keyRejections.findIndex(peer => peer.host == host && peer.port == port);
		return index < 0 ? false : true;
	}
}

class ConnectionMetrics extends ConnectionManager {
	constructor() {
		super();
		this.connMgr = new ConnectionManager();
		setImmediate(() => this.emit("metricsBase.ready", this));	// TODO: raise this even on database ready
	}
	close() {
		super.close();
	}
	getBootstrapServers(def = []) {
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
	 * Returns a connection if peer is valid.
	 */
	isPeerValid(peerInfo, targetKey, lookupTracker) {
		return this.isPeerBlacklisted(peerInfo);
	}
	recordEntry(targetKey, conn, timeSpent) {
		// TODO: for first connect, for UDPClient, setup client.start(500); // poll at 500ms
		this.addConnection(targetKey, conn);
		// TODO:
		// 1. add referrer to bootstrap nodes
		// 2. save the { targetKey -> peer } mapping, along with the current timestamp (last accessed)
		// 3. save the timeSpent performance metric
	}
}

/**
 * Maintains the "in-progress" connection requests, so that we 
 * can avoid duplicate connection requests for the same host. Only 
 * maintains the promises. The actual connections, once successful, 
 * are stored in the ConnectionManager;
 */
class ConnectionReqManager {
	constructor() {
		this.connectReqs = new Map(); // successful or in-progress requests till now; Maps {<hostname:port> -> Promise<connection>}
	}
	connectTo(peerInfo, connectCB) {
		const connString = `${peerInfo.host}:${peerInfo.port}`;
		// if a previously resolved, or in-progress request is available, return it;
		// This way, we do not create multiple connections to the same <host:port>;
		const req = this.connectReqs.get(connString); if (req) console.log("--reusing conn: ", connString);
		if (req) return req;
		// Either no previous attempt was made, or previous attempt failed (hence promise removed from the q);
		// make a fresh request (again)
		const connPromise = connectCB(peerInfo); console.log("--ConnectionReqManager req start: ", connString);
		connPromise.catch(err => {
			// remove it so that next time fresh connection attempt can be made again
			this.connectReqs.delete(connString);
		});
		connPromise.then(conn => {
			// successfully connected, keep the promise in this.connectReqs{} and resolve it;
			// we only cache the promises here, the actual connections are held in ConnectionManager.
			conn.once("closed", () => this.connectReqs.delete(connString));
		});
		this.connectReqs.set(connString, connPromise);
		return connPromise;
	}
	close() {
		// nothing to do. in-progress requests are either deleted on failure, or 
		// held in the ConnectionManager and closed when appropriate.
	}
};

class HSNWConnection extends EventEmitter {
	constructor(socket, isTCP) {
		super();
		this.s = socket;
		socket.on("error", err => { /* "close" event will follow this automatically. Still need this handler to avoid app crash */ });
		socket.once("close", () => this.close()); // whenever disconnected, close the connection
		socket.on("data", data => this.onDataRead(data));
		this.requestQ = new Map(); // active Requests waiting for response (or 'in-progress' streams?)
	}
	close() {
		if (this.closed) return;
		this.closed = true;
		this.requestQ.clear(); // we are not cancelling the Requests, we are just removing the trackers (server may comeback with response, but we will not be around)
		this.s.destroy(); // close the socket
		this.emit("closed");
	}
	isActive() {
		if (this.closed) return 0;
		return true; // Does Socket offer any status?
	}
	send(data, encoding, cb) {
		return this.s.write(data, encoding, cb);
	}
	/**
	 * @returns a tracker that allows cancel() of the request. It holds a promise
	 * that resolves when the request has a response, and rejects when an error happens 
	 * or timeout is reached.
	 */
	request(method, params, timeoutMS = 5000) {
		return new Promise((resolve, reject) => {
			const tracker = new RPCRequestTracker({ jsonrpc: "2.0", method, params });
			this.send(tracker.req.toString(), err => {
				if (err) return reject(err); // send failed
				// send queued, now caller can wait on tracker.p<> promise to resolve for result;
				// Also tracker.p<> rejects with TIMEOUT error if timeout is specified (0 disables the timeout)
				if (timeoutMS) tracker.setExpiry(timeoutMS, gRPCRequestExpiryQ);
				this.requestQ.set(tracker.req.id, tracker); // add to the Q so that onDataRead we can do id -> tracker mapping
				tracker.p.finally(() => this.requestQ.delete(tracker.req.id)); // finished or cancelled, remove from the queue
				resolve(tracker);
			});
		});
	}
	cancelPendingRequests(reason = "Request Cancelled") {
		for (let reqTracker of this.requestQ.values())
			reqTracker.cancel(reason);
		this.requestQ.clear();
	}
	onDataRead(data) {
		try {
			const msg = JSON.parse(data.toString());
			if (msg.jsonrpc !== "2.0" || !msg.id) return; // nothing we can do !!

		} catch (ex) { console.error("Received error from socket: ", ex) };
	}
}

class HSNetworkConnMetrics extends ConnectionMetrics {
	constructor(opts, nw) {
		super(opts);
		this.nw = nw;
		this.connectReqs = new ConnectionReqManager();
	}
	static create(opts) {
		return new Promise((resolve, reject) => {
			const newObj = new HSNetworkConnMetrics(opts);
			newObj.once("metricsBase.ready", () => {
				newObj.getBootstrapServers(opts.bootstrap).then(bootstrap => {
					newObj.nw = HyperSwarmNetwork({ ephemeral: opts.ephemeral, bootstrap });
					newObj.nw.bind(err => err ? reject(err) : resolve(newObj));
				}).catch(err => reject(err));
			});
		});
	}
	close() {
		if (this.connectReqs) {
			this.connectReqs.close();
			this.connectReqs = null;
		}
		super.close();
		if (this.nw) {
			this.nw.close();
			this.nw = null;
		}
	}
	/**
	 * Verifies if the peer is valid owner of the said targetKey.
	 */
	isPeerValid(peerInfo, targetKey, lookupTracker) {
		// 1. check if duplicate (pending validation / ongoing validation)
		// 2. check if previously validated
		// 3. connect and ask if it is valid
		return super.isPeerValid(peerInfo, targetKey, lookupTracker).then(blacklisted => {
			if (blacklisted || this.hasPeerBeenRejected(peerInfo) || !lookupTracker.isInProgress()) return null;
			console.log(`validating peer ${peerInfo.host}:${peerInfo.port} for key: ${targetKey}`);
			// peer was not blacklisted, nor rejected earlier for this key;
			// connect to it and validate the public key
			const connPromise = this.connectReqs.connectTo(peerInfo, _peerInfo =>
				new Promise((resolve, reject) => this.nw.connect(_peerInfo, (err, socket, isTCP) => err ? reject(err) : resolve(new HSNWConnection(socket, isTCP))))
			);
			return connPromise.then(conn => {
				console.log("connected to peer: ", `${peerInfo.host}:${peerInfo.port}`);
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
				}).catch(err => {
					conn.close(); return null;
				}); // RPC might have timed out, or some other error. Just consider as auth failure
			}).catch(err => null /* connection establishment failed */);
		}).catch(err => null /* super class decided it as invalid peer */);
	}
};

class LookupTracker extends Tracker {
	constructor(targetKey, metrics) {
		super();
		this.targetKey = targetKey;
		this.metrics = metrics;
		this.connInProgress = new Map(); // keep track of in-progress validations to avoid duplicates
	}
	// returns true if peer is found / search cancelled
	onPeer(peerInfo) {
		if (this.isInProgress() == false) return Promise.resolve(true); console.log("on peer: ", this.connInProgress);
		const connString = peerInfo.host + ":" + peerInfo.port; if (this.connInProgress.has(connString)) console.log("LookupTracker: onPeer duplicate ", connString);
		if (this.connInProgress.has(connString)) return Promise.resolve(false);  // ignore duplicates (no matter who referred)	
		return this.metrics.isReferrerBlacklisted(peerInfo.referrer).then(referrerBlacklisted => {
			if (referrerBlacklisted) return false; console.log("LookupTracker: onPeer, going to verify ", connString);
			this.connInProgress.set(connString, true); // add to "in progress" list (to ignore duplicates)
			return this.metrics.isPeerValid(peerInfo, this.targetKey, this).then(connection => {
				console.log("on peerValid.then ", this.connInProgress);
				this.connInProgress.delete(connString); // allow retry in the next update (in case of success, connection is already cached, so no harm)
				if (!connection) return false;
				this.finish(connection); console.log("LookupTracker: onPeer, found ", connString);
				this.metrics.recordEntry(ths.targetKey, connection, this.timeSpent());
				return true; // found a peer, finally
			});
		}).catch(err => {/* referrer blacklisted, do nothing */ });
	}
}

class HSNetworkLookup {
	constructor(targetKey, timeout, tracker) {
		this.nRetryAttempt = 0; console.log("HSNetworkLookup.targetKey: ", targetKey, " buf: ", MultiBase.decode(targetKey));
		this.topic = tracker.metrics.nw.lookup(MultiBase.decode(targetKey));
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
	constructor(m) {
		this.metrics = m;
		this.activeTrackers = new Map();
	}
	static create({
		ephemeral = true,
		bootstrap = DISCO_BOOTSTRAP,
		opts = {} } = {})
	{
		return HSNetworkConnMetrics.create({ ephemeral, bootstrap, opts }).then(locatorMetrics => new Locator(locatorMetrics));
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
		const activeTracker = this.activeTrackers.get(pubKey);
		if (activeTracker && activeTracker.isInProgress()) return activeTracker.p;

		const tracker = new LookupTracker(pubKey, this.metrics);
		this.activeTrackers.set(pubKey, tracker);
		const hdLookup = new HSNetworkLookup(pubKey, timeout, tracker); // TODO: add other discovery lookups here
		// TODO: in parallel lookup the metrics database to connect last known IP for the owner (use the same tracker)
		//	1. read the last known ips from the DB, and use tracker.onPeer(<ip>) on each of them
		//		 if the ip resolves, then it will call finish() and stops all the searches for it
		//	2. also check if any "future" ip was mentioned by peer (before last disconnect), and try that as well.

		return tracker.p.finally(() => { this.activeTrackers.delete(pubKey); });
	}
	close() {
		for (let tracker of this.activeTrackers.values())
			tracker.cancel(`Locator.close()`);
		this.activeTrackers.clear();
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

Locator.create().then(l => {
	l.invoke().then(console.log).catch(console.log).finally(() => {
		console.log("finally");
		gRPCRequestExpiryQ.close();
		l.close();
		//setTimeout(() => setImmediate(() => ActiveHandles()), 0);
	});
});


process.on('unhandledRejection', (reason, _p) =>
	console.error(`[Unhandled Rejection] ${reason.stack ? reason.stack : reason.message }`)
);
