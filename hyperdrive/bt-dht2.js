var DHT = require('bittorrent-dht')
var magnet = require('magnet-uri')

var uri = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47412345'
var parsed = magnet(uri)

console.log(parsed.infoHash) // 'e3811b9539cacff680e418124272177c47477157'

var dht = new DHT()
const port = 22345;

dht.listen(port, function () {
	console.log('now listening: ', dht.address());
})

dht.on('peer', function (peer, infoHash, from) {
	console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
})

dht.announce(parsed.infoHash, port, err => { if (err) console.error("announce error: ", err) });