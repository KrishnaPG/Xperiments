let lotion = require('lotion');

let app = lotion({
  initialState: {
    count: 0
  },
  // keyPath: 'keys.json',        // path to keys.json. generates own keys if not specified.
  // genesisPath: 'genesis.json', // path to genesis.json. generates new one if not specified.
  peers: [],                   // array of '<host>:<p2pport>' of initial tendermint nodes to connect to. does automatic peer discovery if not specified.
  logTendermint: true,         // if true, shows all output from the underlying tendermint process
  p2pPort: 46658,              // port to use for tendermint peer connections
  rpcPort: 46657               // port to use for tendermint rpc
})

app.use(function (state, tx) {
  if (state.count === tx.nonce) {
    state.count++
  }
})

app.start()