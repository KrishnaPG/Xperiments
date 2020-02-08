/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const atExit = require('exit-hook');
const Discovery = require('@hyperswarm/discovery');
const ENet = require('enet');
const MultiBase = require('multibase');
const Sodium = require('sodium-native');
const uWS = require('uWebSockets.js');
const WebSocket = require('ws');

class UDPServer{
	constructor(eNetServer) {
		this.server = eNetServer;
		this.server.on("connect", (peer, data) => {
			console.log("peer connected: ", peer, data);
			peer.on("message", (packet, channel) => {
				console.log("Message: ", packet, channel);
			})
		})
	}
	close() {
		if (this.server) {
			this.server.destroy();
			this.server = null;
		}
	}
	static create(maxPeers = 32, maxChannels = 64) {
		return new Promise((resolve, reject) => {
			const address = new ENet.Address("0.0.0.0", 12345);
			ENet.createServer({ address, peers: maxPeers, channels: maxChannels, down: 0, up: 0 }, (err, server) => {
				if (err) return reject(err);
				server.start(500); // poll at 500ms
				resolve(new UDPServer(server));
			});
		});
	}	
};
const udpServer = UDPServer.create();


/* 
// generate new key-pair
const pubKeyBuf = Buffer.alloc(Sodium.crypto_sign_PUBLICKEYBYTES);
const secKeyBuf = Buffer.alloc(Sodium.crypto_sign_SECRETKEYBYTES);
Sodium.crypto_sign_keypair(pubKeyBuf, secKeyBuf); 
console.log("pubKey: ", pubKeyBuf.toString("hex"), ", secKey: ", secKeyBuf.toString("hex"));
*/

const pubKeyBuf = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");
const secKeyBuf = Buffer.from("d5b2af6cd97a721d24784ce843ef31ee3a566066aa4505364e828cbdef5149281696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");

const announceKey = MultiBase.encode("base58btc", pubKeyBuf).toString(); console.log("announcing: ", announceKey, " buf: ", pubKeyBuf);

const d = Discovery();
const topic = d.announce(pubKeyBuf, { port: 12345, lookup: true });
topic.once('close', () => console.log("unAnnounced and topic closed"));

const wss = new WebSocket.Server({
	host: '0.0.0.0',
	port: 12345,
	perMessageDeflate: false
});
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('[server] received: %s', message);
	});

	ws.send(`[server]: ${new Date()}`);
});

atExit(() => {
	topic.destroy(); // un-announce the key	
	d.destroy(); // free the resources (also destroys all topics)
});
