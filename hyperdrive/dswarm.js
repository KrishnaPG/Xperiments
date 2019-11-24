var swarm = require('discovery-swarm')

var sw = swarm()

sw.listen(1000)
sw.join('ubuntu-14.04') // can be any id/name/hash

sw.on('connection', function (connection, info) {
	console.log('found + connected to peer:  connection, \ninfo: ', info);

	connection.on("data", data => console.log("received data: ", data));
	connection.write("hello there from node1 ");
	connection.end();
});

sw.on("redundant-connection", function (connection, info) {
	console.log("------------------------------------------");
	console.log('Dropping duplicate connection:  connection, \ninfo: ', info);
})