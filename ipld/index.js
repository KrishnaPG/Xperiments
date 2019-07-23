const Client = require('./client');

async function setRepo() {
  const IPFS = require('ipfs')
  const Repo = require('ipfs-repo')
  // Create our custom options
  const customRepositoryOptions = {
    /**
     * IPFS nodes store different information in separate storageBackends, or datastores.
     * Each storage backend can use the same type of datastore or a different one — you
     * could store your keys in a levelDB database while everything else is in files,
     * for example. (See https://github.com/ipfs/interface-datastore for more about datastores.)
     */
    storageBackends: {
      root: require('./store-fs'), // version and config data will be saved here
      blocks: require('./store-fs'),
      keys: require('./store-fs'),
      datastore: require('./store-fs')
    },
    storageBackendOptions: {
      root: {
        extension: '.ipfsroot', // Defaults to ''. Used by datastore-fs; Appended to all files
        errorIfExists: false, // Used by datastore-fs; If the datastore exists, don't throw an error
        createIfMissing: true // Used by datastore-fs; If the datastore doesn't exist yet, create it
      },
      blocks: {
        sharding: true, // Used by IPFSRepo Blockstore to determine sharding; Ignored by datastore-fs
        extension: '.ipfsblock', // Defaults to '.data'.
        errorIfExists: false,
        createIfMissing: true
      },
      keys: {
        extension: '.ipfskey', // No extension by default
        errorIfExists: false,
        createIfMissing: true
      },
      datastore: {
        extension: '.ipfsds', // No extension by default
        errorIfExists: false,
        createIfMissing: true
      }
    }
  }  
  const repo = new Repo('./tmp/ipfs-repo', customRepositoryOptions)
  // Initialize our IPFS node with the custom repo options
  const node = new IPFS({
    repo
  })

  // Test the new repo by adding and fetching some data
  node.on('ready', () => {
    console.log('Ready')
    node.version()
      .then((version) => {
        console.log('Version:', version.version)
      })
      // Once we have the version, let's add a file to IPFS
      .then(() => {
        return node.add({
          path: '/test-data.txt',
          content: Buffer.from('We are using a customized repo! ' + Date())
        })
      })
      // Log out the added files metadata and cat the file from IPFS
      .then((filesAdded) => {
        console.log('\nAdded file:', filesAdded[0].path, filesAdded[0].hash)
        return node.cat(filesAdded[0].hash)
      })
      // Print out the files contents to console
      .then((data) => {
        console.log('\nFetched file content:')
        process.stdout.write(data)
      })
      // Log out the error, if there is one
      .catch((err) => {
        console.log('File Processing Error:', err)
      })
      // After everything is done, shut the node down
      // We don't need to worry about catching errors here
      .then(() => {
        // console.log('\n\nStopping the node')
        // return node.stop()
        node.files.ls("/", (err, output) => {
          console.log("/ listing: ", err, output);
        })
        // The address of your files.
        const addr = '/ipfs/QmbezGequPwcsWo8UL4wDF6a8hYwM1hmbzYv2mnKkEWaUp'

        node.name.publish(addr, function (err, res) {
          // You now receive a res which contains two fields:
          //   - name: the name under which the content was published.
          //   - value: the "real" address to which Name points.
          console.log(`https://gateway.ipfs.io/ipns/${res.name}`)
        })

        const Gateway = require('ipfs/src/http')
        const gateway = new Gateway(node)
        return gateway.start()
      })
      // Let users know where they can inspect the repo
      .then(() => {
        console.log('Check "/tmp/custom-repo/.ipfs" to see what your customized repository looks like on disk.')
      })
  })  
}

// linkNodes();
// setRepo();

var ipfsClient = require('ipfs-http-client')

// example cid to pin
var exampleCID = 'QmS4ustL54uo8FzR9455qaxZwuMiUhyvMcX9Ba8nUH4uVv'
// TEMPORAL_JWT is an environment variable used to provide the jwt needed to authenticate with temoral
// optionally, you could import https://github.com/clemlak/temporal-js and use the login function
// to return the jwt
var jwt = process.env.TEMPORAL_JWT

// specify how we will connect the ipfs client
var ipfs = ipfsClient({
  // the hostname (or ip address) of the endpoint providing the ipfs api
  host: 'dev.api.ipfs.temporal.cloud',
  // the port to connect on
  port: '443',
  'api-path': '/api/v0/',
  // the protocol, https for security
  protocol: 'https',
  // provide the jwt within an authorization header
  headers: {
    authorization: 'Bearer ' + jwt
  }
})

// use the js-ipfs-http-client library to pin a particular CID
// this will be procesed like any other IPFS API, however
// it will be backed up by the infrastructure under Temporal.
ipfs.pin.add(exampleCID, function (err, response) {
  if (err.code == 401) console.error("---------we need to retry ");
  if (err) {
    console.error(err, err.stack)
    throw err
  }
  console.log("pin response: ", response);
})

ipfs.block.put(Buffer.from("Hello " + Date()), (err, block) => {
  if (err.code == 401 || err.code == 403) console.error("---------we need to retry ");
  if (err) {
    console.error(err, err.stack)
    throw err
  }
  console.log("put block: ", block);
})