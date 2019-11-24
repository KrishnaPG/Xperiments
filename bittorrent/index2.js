var WebTorrent = require('webtorrent')

var client = new WebTorrent();
var magnetURI = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47477157'
//var magnetURI = 'magnet:?xt=urn:btih:8664b1b318c04c9a648834675b93af999d828404&dn=Some+file+name&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'

var buf = new Buffer('Some file content')
buf.name = 'Some file name';
client.seed(buf, x => {
	console.log("on seed: ", x);
});

client.add(magnetURI, function (torrent) {
	// Got torrent metadata!
	console.log('Client is downloading:', torrent);

	torrent.files.forEach(function (file) {
		// Display the file by appending it to the DOM. Supports video, audio, images, and
		// more. Specify a container element (CSS selector or reference to DOM node).
		console.log("file: ", file);
	})
});
