const streamCollect = require('stream-collector');
var hyperdb = require('hyperdb')

const crypto = require('crypto');
const dht = require('dht-rpc')
// Set ephemeral: true so other peers do not add us to the peer list, simply bootstrap
const bootstrap = dht({ ephemeral: false })
bootstrap.listen(10001)
function createNode() {
	const node = dht({
		bootstrap: [
			'142.93.90.113:54472'
		]
	})
	const values = new Map()
	node.command('values', {
		// When we are the closest node and someone is sending us a "store" command
		update(query, cb) {
			if (!query.value) return cb()
			// Use the hash of the value as the key
			const key = sha256(query.value).toString('hex')
			values.set(key, query.value)
			console.log('Storing', key, '-->', query.value.toString())
			cb()
		},
		// When someone is querying for a "lookup" command
		query(query, cb) {
			const value = values.get(query.target.toString('hex'))
			cb(null, value)
		}
	})
}
function sha256(val) {
	return crypto.createHash('sha256').update(val).digest()
}

createNode();


const DatBackup = require('./dat-backup');

const Hyperdrive = require('hyperdrive');

var archive = Hyperdrive('./.tmp/test-drive2') // content will be stored in this folder

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