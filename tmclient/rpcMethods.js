/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 * 
 * Auto generated by tool - do NOT edit it manually.
 * 
 */
class TMRPC {
	constructor(ws) {
		this.ws = ws; // should have already been connected to a server by this point
	}
	status({ id, params }, cb) {
		this.ws.send({ jsonrpc: '2.0', id, method: 'status', params }, {binary: true}, cb);
	}
	health({ id, params }, cb) {
		this.ws.send({ jsonrpc: '2.0', id, method: 'health', params }, { binary: true }, cb);
	}
	broadcast_tx_sync({ id, params }, cb) {
		this.ws.send({ jsonrpc: '2.0', id, method: 'broadcast_tx_sync', params }, { binary: true }, cb);
	}
}

module.exports = TMRPC;