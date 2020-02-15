/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const atExit = require('exit-hook');
const MultiBase = require('multibase');
const Sodium = require('sodium-native');

/* 
// generate new key-pair
const pubKeyBuf = Buffer.alloc(Sodium.crypto_sign_PUBLICKEYBYTES);
const secKeyBuf = Buffer.alloc(Sodium.crypto_sign_SECRETKEYBYTES);
Sodium.crypto_sign_keypair(pubKeyBuf, secKeyBuf); 
console.log("pubKey: ", pubKeyBuf.toString("hex"), ", secKey: ", secKeyBuf.toString("hex"));
*/

const pubKeyBuf = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");
const secKeyBuf = Buffer.from("d5b2af6cd97a721d24784ce843ef31ee3a566066aa4505364e828cbdef5149281696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");

const announceKey = MultiBase.encode("base58btc", pubKeyBuf); console.log("announcing: ", announceKey.toString(), " buf: ", pubKeyBuf);

/*
const d = Discovery();
const topic = d.announce(pubKeyBuf, { port: 12345, lookup: true });
topic.once('close', () => console.log("unAnnounced and topic closed"));
*/

const network = require('@hyperswarm/network');

const nw = network({
	socket(socket, isTCP) { 
		console.log("network incoming socket: ", socket.remoteAddress, socket.remotePort, socket.remoteFamily, " is TCP: ", isTCP);
		//socket.write(`Hello Client from server [${new Date()}]`);
		socket.on("data", msg => {
			console.log(msg.toString());
			socket.write(msg.toString());
		});
		socket.on("close", () => socket.destroy());
		socket.on("error", err => { /* "close" event will follow this automatically. But still need this handler to avoid app crash */ });
	},
	ephemeral: false
})

nw.bind(12345, function () {
	nw.announce(pubKeyBuf);

	// topic should be a 32 byte buffer
	nw.lookup(pubKeyBuf, function (err, peer) {
		if (err) throw err
		console.log("lookedup peer: ", peer);
		if (peer.local) return;
		nw.connect(peer, function (err, socket) {
			if (err) throw err
			socket.write('Hello World!');
		})
	})
})

/*
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
});*/

atExit(() => {
	nw.close();
	return;
	topic.destroy(); // un-announce the key	
	d.destroy(); // free the resources (also destroys all topics)
});
