const streamCollect = require('stream-collector');
var hyperdb = require('hyperdb')
const crypto = require('crypto');
const dht = require('dht-rpc')

const SDK = require('dat-sdk')
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = SDK();

const ExtName = "Fict.Dat.RPC";

const archive = Hyperdrive("e8474fb2df40812eac9babbfe4d9369f72fa63cec6c058f8626cdde6deecfb65", {
	// This archive will disappear after the process exits
	// This is here so that running the example doesn't clog up your history
	persist: true,
	createIfMissing: false,
	// storage can be set to an instance of `random-access-*`
	// const RAI = require('random-access-idb')
	// otherwise it defaults to `random-access-web` in the browser
	// and `random-access-file` in node
	//storage: null,  //storage: RAI,
	//extensions: [ExtName]
})

archive.on('ready', () => {
	const url = `dat://${archive.key.toString('hex')}`
	console.log(`Here's your URL: ${url}`, "discovery key: ", archive.discoveryKey.toString('hex'), " version: ", archive.version);

	setInterval(() => {
		const str = `world-${(new Date()).toLocaleTimeString()}`;
		archive.writeFile('/example.txt', str, () => {
			console.log('Written example file!', str);
		})
	}, 10000);

	archive.on('peer-add', (peer) => {
		console.log("peer added: ", peer);
	});	
});

/*

function sha256(val) {
	return crypto.createHash('sha256').update(val).digest()
}
const node = dht({
	ephemeral: false, bootstrap: [
		'142.93.90.113:54472'
	] });
const val = "12345";
let hex = null;
node.update('values', sha256(val), val, function (err, res) {
	if (err) throw err	
	hex = sha256(val).toString('hex');
	console.log('Inserted', hex);

	node.query('values', Buffer.from(hex, 'hex'))
		.on('data', function (data) {
			if (data.value && sha256(data.value).toString('hex') === hex) {
				// We found the value! Destroy the query stream as there is no need to continue.
				console.log(data.value, '-->', data.value.toString())
				this.destroy()
			}
		})
		.on('end', function () {
			console.log('(query finished)')
		});	

})



const dht = require('@hyperswarm/dht')
const crypto = require('crypto')
const node = dht({
	// just join as an ephemeral node
	// as we are shortlived
	ephemeral: false
})
const topic = Buffer.alloc(32);
topic.write("Hello");
const port = 12346;
// announce a port
node.announce(topic, { port }, function (err) {
	if (err) throw err

	// try and find it
	node.lookup(topic)
		.on('data', console.log)
		.on('end', function () {
			// unannounce it and shutdown
			node.unannounce(topic, { port }, function () {
				node.destroy()
			})
		})
})
*/
/*
const DatBackup = require('./dat-backup');

const Hyperdrive = require('hyperdrive');

var archive = Hyperdrive('./.tmp/test-drive1') // content will be stored in this folder


archive.writeFile(`t1-${Date.now()}`, (new Date()).toString(), err => {
	if (err) console.error("writeFile error: ", err);
	archive.readdir('/', (err, list) => {
		if (err) console.error("readdir error: ", err);
		console.log(list);
		const backupPaths = [];
		list.forEach(fileName => {
			console.log("last: ", fileName.slice(-2));
			const last = Number.parseInt(fileName.slice(-2));
			if ((last % 2) == 0) backupPaths.push(fileName);
		});
		console.log("Taking backup of paths: ", backupPaths);
	})
});



var db = hyperdb('./my.db', { valueEncoding: 'utf-8' });

db.watch('/', function (x) {
	console.log('folder has changed', x);
	db.version((err, v) => {
		console.log("version during change: ", v.toString('hex'));
	})
})

db.put('/hello', `world-${(new Date()).toLocaleTimeString()}`, function (err) {
	if (err) throw err
	db.get('/hello', function (err, nodes) {
		if (err) throw err
		console.log('/hello --> ' + nodes[0].value)
		db.version((err, v) => {
			console.log("new version: ", v.toString('hex'));
			const hs = db.createHistoryStream();
			streamCollect(hs, (err, histCollected) => {
				console.log("collected history: ", histCollected);
			})
		});
	});
})

*/

/*
var hyperdrive = require('hyperdrive')
var archive = hyperdrive('./test-drive1') // content will be stored in this folder

// archive.writeFile('/hello.txt', 'world', function (err) {
// 	if (err) throw err
// 	archive.readdir('/', function (err, list) {
// 		if (err) throw err
// 		console.log(list) // prints ['hello.txt']
// 		archive.readFile('/hello.txt', 'utf-8', function (err, data) {
// 			if (err) throw err
// 			console.log(data) // prints 'world'
// 		})
// 	})
// });


const SDK = require('dat-sdk')
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = SDK()

process.once('SIGINT', destroy)

//const archive = Hyperdrive('./test-drive')

archive.ready(() => {
	const url = `dat://${archive.key.toString('hex')}`

	// TODO: Save this for later!
	console.log(`Here's your URL: ${url}`)

	// Check out the hyperdrive docs for what you can do with it
	// https://www.npmjs.com/package/hyperdrive#api
	archive.writeFile('/example.txt', 'Hello World!', () => {
		console.log('Written example file!')
	})
})

resolveName('dat://beakerbrowser.com', (err, url) => {
	if (err) throw err
	const archive = Hyperdrive(url)

	archive.readFile('/dat.json', 'utf8', (err, data) => {
		if (err) throw err
		console.log(`Beaker's dat.json is ${data}`)

		// archive.close((err) => {
		// 	if (err) throw err
		// 	deleteStorage(archive.key, (e) => {
		// 		if (e) throw e
		// 		console.log('Deleted beaker storage')
		// 	})
		// })
	})
})

const SOME_URL = 'dat://0a9e202b8055721bd2bc93b3c9bbc03efdbda9cfee91f01a123fdeaadeba303e/'

const someArchive = Hyperdrive(SOME_URL)

reallyReady(someArchive, () => {
	someArchive.readdir('/', console.log)
})

// This make sure you sync up with peers before trying to do anything with the archive
function reallyReady(archive, cb) {
	if (archive.metadata.peers.length) {
		archive.metadata.update({ ifAvailable: true }, cb)
	} else {
		archive.metadata.once('peer-add', () => {
			archive.metadata.update({ ifAvailable: true }, cb)
		})
	}
} 

const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = require('dat-sdk')();

// Create a hypercore
// Check out the hypercore docs for what you can do with it
// https://github.com/mafintosh/hypercore
const myCore = Hypercore(null, {
	valueEncoding: 'json',
	persist: false,
	// storage can be set to an instance of `random-access-*`
	// const RAI = require('random-access-idb')
	// otherwise it defaults to `random-access-web` in the browser
	// and `random-access-file` in node
	storage: null  // storage: RAI
});
myCore.on("download", (index, data) => {
	console.log("myCore:download:", index, data);
});
myCore.on("sync", () => {
	console.log("myCore:sync:");
});
myCore.on("upload", (index, data) => {
	console.log("myCore:upload:", index, data);
});

const myId = Math.ceil(Math.random() * 1000);
// Add some data to it
myCore.append(JSON.stringify({
	name: 'Alice' + myId
}), () => {
		console.log("myId: ", myId);
		
		const buf = Buffer.alloc(32);
		buf.write("Hello World");

	// Use extension messages for sending extra data over the p2p connection
	const discoveryCoreKey = buf;//'dat://bee80ff3a4ee5e727dc44197cb9d25bf8f19d50b0f3ad2984cfe5b7d14e75de7'
	const discoveryCore = new Hypercore(discoveryCoreKey, {
		persist: false,
		extensions: ['discovery']
	})

	// When you find a new peer, tell them about your core
	discoveryCore.on('peer-add', (peer) => {
		console.log('Got a peer!');
		peer.extension('discovery', myCore.key);
	})

	// When a peer tells you about their core, load it
	discoveryCore.on('extension', (type, message) => {
		console.log('Got extension message', message);
		if (type !== 'discovery') return
		///discoveryCore.close()

		const otherCore = new Hypercore(message, {
			valueEncoding: 'json',
			persist: false
		});
		otherCore.on("download", (index, data) => {
			console.log("otherCore:download:", index, data);
		});
		otherCore.on("sync", () => {
			console.log("otherCore:sync:");
		});
		otherCore.on("upload", (index, data) => {
			console.log("otherCore:upload:", index, data);
		});


		// Render the peer's data from their core
		otherCore.get(0, console.log)
	})
});

const hypertrie = require('hypertrie')

// Pass in hypercores from the SDK into other dat data structures
// Check out what you can do with hypertrie from there:
// https://github.com/mafintosh/hypertrie
const trie = hypertrie(null, {
	feed: new Hypercore(null, {
		persist: false
	})
})

trie.put('key', 'value', () => {
	trie.get('key', (value) => {
		console.log('Loaded value from trie:', value)
	})
})

*/