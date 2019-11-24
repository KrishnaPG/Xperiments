const hyperswarm = require('hyperswarm')
const crypto = require('crypto')

const swarm = hyperswarm({
	announceLocalAddress: false
})

// look for peers listed under this topic
const topic = crypto.createHash('sha256')
	.update('my-hyperswarm-topic')
	.digest()

swarm.listen(1001, err => { 
	console.log("listening on port 1001");

	swarm.join(topic, {
		lookup: true, // find & connect to peers
		announce: true // optional- announce self as a connection target
	})

	swarm.on('connection', (socket, details) => {
		console.log('new connection!', details.peer);
		const isServer = (details.peer == null);
		const typeStr = isServer ? "As Server" : "As Client";
		socket.on("data", data => console.log(`${typeStr} received data: ${data.toString("utf8")}`));
		if (!isServer)
			socket.write("hello there from node1 ");
	})
});


