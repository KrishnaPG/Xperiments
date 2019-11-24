const ipfsClient = require('ipfs-http-client');
const CID = require('cids')

/*
Creating an IPLD format node:
ipfs.dag.put(dagNode, [options], [callback])
For more information see: 
https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/DAG.md#ipfsdagputdagnode-options-callback
*/
async function linkNodes() {
	//Connecting ipfs instance to infura node. You can also use your local node.
	//const ipfs = new ipfsClient({ host: '127.0.0.1', port: '5002', protocol: 'http' });
	const ipfs = new ipfsClient({ host: 'ipfs.infura.io', port: '5001', protocol: 'https' });
	//const ipfs = new ipfsClient({ host: 'cloudflare-ipfs.com', port: '443', protocol: 'https' });

	let cid1 = await ipfs.dag.put({ name: "vasa" }, { format: 'dag-cbor', hashAlg: 'sha2-256' });
	console.log("firstNode ", cid1, cid1.toBaseEncodedString());
	// zdpuAujL3noEMamveLPQWJPY6CYZHhHoskYQaZBvRbAfVwR8S

	const multihash = cid1.multihash;
	const cids = new CID(1, 'dag-cbor', multihash);
	console.log("Constructed CID:", cids.toBaseEncodedString());
	// bafyreiekjzonwkqd7vcfescxlhvuyn6atdvgevirauupbkncpyebllcuh4

	let secondNode = await ipfs.dag.put({ linkToCID1: cid1 });
	console.log("SecondNode ", secondNode, secondNode.toBaseEncodedString());
	// zdpuAxp26mzjJNVHLi1PB9hAJBc2bTJXAAeqYqy36WiNbc6TC

	ipfs.dag.get(cid1.toBaseEncodedString(), (err, result) => {
		console.log("Dag first: ", result, err);
	});
	ipfs.dag.get(secondNode.toBaseEncodedString() + "/linkToCID1/name", (err, result) => {
		console.log("Dag second: ", result, err);
	});

	ipfs.block.get(cid1, function (err, block) {
		if (err) return console.log("block.get error: ", err);
		console.log("Block.get: ", block, block.data.toString());
		// block.key((err, key) => {
		//   if (err) return console.log("block.key error: ", err);
		//   console.log("Block Key: ", key, block.data)
		// })
	});

	// ipfs.dht.findProvs("zdpuAxp26mzjJNVHLi1PB9hAJBc2bTJXAAeqYqy36WiNbc6TC", { timeout:10000, maxNumProviders: 1 }, (err, peerInfos) => {
	//   console.log(err);
	// })
}

module.exports.linkNodes = linkNodes;