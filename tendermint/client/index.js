const { RpcClient } = require('tendermint');

let client = RpcClient('ws://127.0.0.1:26657')

// // request a block
// client.block({ height: 1 })
// 	.then((res) => console.log(res));

// client.status().then(res => console.log("status: ", res));

client.subscribe({
	"query": "tm.event='NewBlock'"
}, response => console.log("new block response:", response));

client.broadcastTxAsync({
	"tx": Buffer.from(`{val: ${new Date()}}`).toString("base64")
}).then(response => console.log("broadcast response: ", response)).catch(ex => {
	console.error("broadcast failure: ", ex);
});