let tendermint = require('tendermint-node')

const HOME = "./.tendermint";
// init a directory for running tendermint
tendermint.initSync(HOME)

// start the full node
let node = tendermint.node(
  HOME, {
    consensus: {
      create_empty_blocks: false
    },
    // rpc: {
    //   laddr: 'tcp://0.0.0.0:8888'
    // }
  });
node.stdout.pipe(process.stdout)

// start the abci
require('./abciHost');