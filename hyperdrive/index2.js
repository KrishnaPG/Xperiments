const streamCollect = require('stream-collector');
var hyperdb = require('hyperdb')

//const DatBackup = require('./dat-backup');

const SDK = require('dat-sdk')
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = SDK({
	storageOpts: { storageLocation: './.tmp/client' }
});

const ExtName = "Fict.Dat.RPC";

var archive = Hyperdrive('e8474fb2df40812eac9babbfe4d9369f72fa63cec6c058f8626cdde6deecfb65', {
	persist: true,
	createIfMissing: false,
	//extensions: [ExtName]
});

reallyReady(archive, () => {
	archive.readdir('/', console.log);
	archive.on('peer-add', (peer) => {
		console.log("peer added: ", peer);
	});	
})
// This make sure you sync up with peers before trying to do anything with the archive
function reallyReady(archive, cb) {
	if (archive.metadata.peers.length) {
		archive.metadata.update({ ifAvailable: true }, cb)
	} else {
		archive.metadata.once('peer-add', peer => {
			console.log("meta peer-add: ", peer);
			archive.metadata.update({ ifAvailable: true }, cb)
		})
	}
}

archive.readFile('/example.txt', 'utf8', (err, data) => {
	if (err) throw err
	console.log(`content of example.txt: ${data}`);

	archive.on('update', () => {
		console.log("archive updated: ", archive.version);
	});


	// archive.close((err) => {
	// 	if (err) throw err
	// 	deleteStorage(archive.key, (e) => {
	// 		if (e) throw e
	// 		console.log('Deleted beaker storage')
	// 	})
	// })
})

// archive.writeFile(`t2-${Date.now()}`, (new Date()).toString(), err => {
// 	if(err) console.error("writeFile error: ", err);
// 	archive.readdir('/', (err, list) => {
// 		if (err) console.error("readdir error: ", err);
// 		console.log(list);
// 	})
// })

/*
const dht = require('@hyperswarm/dht')
const crypto = require('crypto')
const discovery = require('@hyperswarm/discovery')

const node = dht({
	// just join as an ephemeral node
	// as we are shortlived
	ephemeral: false
})


const topic = Buffer.alloc(32);
topic.write("Hello");

const d = discovery()
const ann = d.announce(key, {
	port: 10000
})

const lookup = d.lookup(key)

// emitted when a peer is found
lookup.on('peer', console.log)
*/