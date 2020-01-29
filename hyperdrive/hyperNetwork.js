const network = require('@hyperswarm/network')

const nw = network()

const ExtName = "Fict.Dat.Backup";
const DiscoKeyStr = `==${ExtName}.DiscoveryKey==`;
const DiscoKeyBuf = Buffer.alloc(32);
DiscoKeyBuf.write(DiscoKeyStr);

nw.bind(function () {
	// topic should be a 32 byte buffer
	const topic = DiscoKeyBuf;
	nw.lookupOne(topic, function (err, peer) {
		if (err) throw err
		nw.connect(peer, function (err, socket) {
			if (err) throw err
			socket.write('Hello World!')
		})
	})
})