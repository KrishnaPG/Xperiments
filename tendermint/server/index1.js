let tendermint = require('tendermint-node')
/*
const HOME = "./.tendermint";
// init a directory for running tendermint
tendermint.initSync(HOME)

// start the full node
let node = tendermint.node(
  HOME, {
    consensus: {
      create_empty_blocks: false
    },
    rpc: {
      laddr: 'tcp://0.0.0.0:8888' // # TCP or UNIX socket address for the RPC server to listen on
    }
  });
node.stdout.pipe(process.stdout);
node.stderr.pipe(process.stderr); */

// print process.argv
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});

console.log("port: ", process.argv[2]);

// start the abci
const abciServer = require('./abciHost1');
abciServer.listen(process.argv[2]);// 26658