var WebTorrent = require('webtorrent')

var client = new WebTorrent();
var magnetURI = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47477157'

var buf = new Buffer('Some file content')
buf.name = 'Some file name';
client.seed(buf, x => {
	console.log("on seed: ", x);
});
/*
client.add(magnetURI, function (torrent) {
	// Got torrent metadata!
	console.log('Client is downloading:', torrent);

	torrent.files.forEach(function (file) {
		// Display the file by appending it to the DOM. Supports video, audio, images, and
		// more. Specify a container element (CSS selector or reference to DOM node).
		console.log("file: ", file);
	})
});
*/