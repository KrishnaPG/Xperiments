const createServer = require('abci')

/**
 * Tendermint opens three connections to the application to handle the different message types:
    - Consensus Connection: InitChain, BeginBlock, DeliverTx, EndBlock, Commit
    - MemPool Connection: CheckTx
    - Info Connection: Info, SetOption, Query
   Note that messages may be sent concurrently across all connections, a typical application will 
   thus maintain a distinct state for each connection. They may be referred to as the DeliverTx state, 
   the CheckTx state, and the Commit state respectively.
 */
const server = createServer({
  info({ version, blockVersion, p2pVersion }) {
    return {
      data: 'Node.js ABCI app',
      version: '0.0.0',
      lastBlockHeight: 21,
      lastBlockAppHash: Buffer.alloc(0) // Buffer.from("F83A0213C5213E1E64D6741B91FC5C6D35D4BEEB5F80B6201293102C17ABAD17", "hex")
      /**
       * Tendermint expects LastBlockAppHash and LastBlockHeight to be 
       * updated during Commit, ensuring that Commit is never called twice for the same block height.
       */
    }
  },
  /**
   * Set app-specific options that are non-critical for the consensus
   */
  setOption: (key, value) => {
    console.log("setOption: ", key, value);
    return {
      code: 0, // OK
      log: `setOption: ['${key}']='${value}'`,
      info: `info`
    }
  },
  query: ({ data, path, height, prove }) => {
    return {
      code: 0,
      log: `query: data=${data}, path='${path}', height=${height}, prove=${prove}`,
      index: -1,
      key: Buffer.alloc(0),
      value: Buffer.alloc(0),
      proof: Buffer.alloc(0),
      height
    }
  },
  
  /**
   * The first time a new blockchain is started, Tendermint calls InitChain.
   * Execution Sequence: BeginBlock, [DeliverTx], EndBlock, Commit,
   *    where one DeliverTx is called for each transaction in the block
   */
  initChain: ({ validators, appStateBytes }) => {
    console.log("initChain: ", arguments);
  },
  beginBlock: ({ hash, header, absentValidators, byzantineValidators }) => {
    console.log(`beginBlock: hash=${hash.toString('base64')}, header=${header.toString()}`);
    return {}
  },
  deliverTx: ({ tx }) => {
    console.log("rejecting deliverTx: ", tx.toString());/*
    return {
      code: 0,
      log: `deliverTx: ${tx}`,
      data: Buffer.alloc(0),
      gasWanted: 0,
      gasUsed: 0,
      tags: []
    }*/
    return {
      code: 1,
      log: 'tx does not match state'
    }    
  },
  // endBlock: (request) => {
  //   console.log("endBlock: ", request);
  //   return {}
  // },
  // commit: () => {
  //   console.log("-------------commit---------");
  //   return {}
  // },

  /**
   * MemPool Connection - CheckTx
   */
  checkTx: ({ tx }) => {
    console.log("not rejecting checkTx: ", tx.toString());
    return {
      code: 0,
      log: 'tx succeeded',
      data: Buffer.alloc(0),
      gasWanted: 0,
      gasUsed: 0,
      tags: []
    }
    return {
      code: 1,
      log: 'tx does not match state'
    }
    return new Promise((resolve, reject) => {
      setTimeout(() => { console.log("resolving tx:", tx.toString()); resolve({}); }, 10000);
    })
  }
});
module.exports = server;