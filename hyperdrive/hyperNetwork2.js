const network = require('@hyperswarm/network')

const nw = network({
	socket(s) {
		console.log("called when an incoming socket is received: ", s);
	},
	ephemeral: false // we need to announce
})

const ExtName = "Fict.Dat.Backup";
const DiscoKeyStr = `==${ExtName}.DiscoveryKey==`;
const DiscoKeyBuf = Buffer.alloc(32);
DiscoKeyBuf.write(DiscoKeyStr);

const topic = DiscoKeyBuf;

nw.bind(12345, function () {
	nw.announce(topic);
})