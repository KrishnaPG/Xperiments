/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const Websocket = require("ws");
const RPCMethods = require('./rpcMethods');

class RPCClient {
	/**
	 * @param {String} url - websocket server url
	 * @param {Object} options - websocket options
	 * @param {Object} eventHandlers - handler functions for "open", "close", "error" etc. events
	 */
	constructor({ url, options, eventHandlers}) {
		Object.keys(eventHandlers).forEach(key => this.ws.addEventListener(key, eventHandlers[key]));
	}
	connect(url) {
		const ws = new Websocket(url);
		return this;
	}
	close() {
		this.ws.close(0);
	}	
}

module.exports = RPCClient;