let createServer = require('abci')

let server = createServer({
  info(request) {
    console.log('got info request', request)
    return {
      data: 'Node.js ABCI app',
      version: '0.0.0',
      lastBlockHeight: 0,
      lastBlockAppHash: Buffer.alloc(0)
    }
  },
  // echo: (request) => {
  //   console.log("echo: ", request);
  // },
  // flush: (request) => {
  //   console.log("flush: ", request);
  // },
  // setOption: (request) => {
  //   console.log("setOption: ", request);
  // },
  // initChain: () => {
  //   console.log("initChain: ", arguments);
  // },
  // query: (request) => {
  //   console.log("query: ", request);
  //   return {}
  // },
  // beginBlock: (request) => {
  //   console.log("beginBlock: ", request);
  //   return {}
  // },
  checkTx: (request) => {
    console.log("checkTx: ", request.tx.toString());
    //return {};
    return new Promise((resolve, reject) => {
      setTimeout(() => { console.log("resolving tx:", request.tx.toString()); resolve({}); }, 10000);
    })
  },
  // deliverTx: (request) => {
  //   console.log("deliverTx: ", request);
  //   return {}
  // },
  // endBlock: (request) => {
  //   console.log("endBlock: ", request);
  //   return {}
  // },
  // commit: () => {
  //   console.log("-------------commit---------");
  //   return {}
  // }
})
server.listen(26658)