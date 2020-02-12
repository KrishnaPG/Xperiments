
const ENet = require('enet');
const Discovery = require('@hyperswarm/discovery');
const WebSocket = require('ws');


class UDPConnection extends EventEmitter {
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


class UDPLocatorMetrics extends ConnectionMetrics {
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
			return this.rpcClientHost.connectTo(peerInfo).then(conn => {
				console.log("connected to peer: ", peerInfo);
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