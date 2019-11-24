/**
 * Copyright © 2019 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { Hypercore, destroy } = require('dat-sdk')();

const ExtName = "Fict.Dat.Backup";
const DiscoKeyStr = `==${ExtName}.DiscoveryKey==`;
const DiscoKeyBuf = Buffer.alloc(32);
DiscoKeyBuf.write(DiscoKeyStr);

const discoveryCore = new Hypercore(DiscoKeyBuf, {
	extensions: [ExtName]
});

// When you find a new peer, tell them to talk Fict.Dat.Backup language
discoveryCore.on('peer-add', (peer) => {
	console.log('Got a peer!', peer.feed.key.toString("base64"), " discovery key: ", peer.feed.discoveryKey.toString("base64"));
	peer.extension(ExtName, Buffer.from("some message"));
})


// When a peer tells you about their core, load it
discoveryCore.on("extension", (type, message) => {
	console.log('Got extension message', type, message)
	if (type !== ExtName) return;
})

class Backup {
	addPaths(paths) {
		if (Array.isArray(paths)) {
			// we are expecting array of path strings
		} else {
			// we are expecting kv-pairs of { path: <backupOptions> }
		}
	}
}