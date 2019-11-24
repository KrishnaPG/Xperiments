var WebTorrent = require('webtorrent')

let hash = "8664b1b318c04c9a648834675b93af999d828404";

var client = new WebTorrent();

//var magnetURI = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47477157'
var magnetURI = 'magnet:?xt=urn:btih:8664b1b318c04c9a648834675b93af999d828404'

client.add(magnetURI, function (torrent) {
	// Got torrent metadata!
	console.log('Client is downloading:', torrent);

	torrent.files.forEach(function (file) {
		// Display the file by appending it to the DOM. Supports video, audio, images, and
		// more. Specify a container element (CSS selector or reference to DOM node).
		console.log("file: ", file);
	})
});


// var DHT = require('bittorrent-dht')
// var magnet = require('magnet-uri')

// var uri = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47477157'
// var parsed = magnet(uri)

// console.log(parsed.infoHash) // 'e3811b9539cacff680e418124272177c47477157'

// var dht = new DHT({ nodeId: "index.js" })

// dht.listen(20000, function () {
// 	console.log('now listening')
// })

// dht.on('peer', function (peer, infoHash, from) {
// 	console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
// })

// // find peers for the given torrent info hash
// dht.lookup(hash);
// dht.lookup(parsed.infoHash);

