const Tile38 = require('tile38'); 

const client = new Tile38({ host: '159.89.195.95', port: 9851, debug: false });

// save a location
//client.set('fleet', 'truck1', [33.5123, -112.2693]);
// save a location with additional fields
//client.set('fleet', 'truck2', [33.5123, -112.2693], { value: 10, othervalue: 20 });

client.get('fleet', 'truck1').then(data => {
	console.log("truck1: ", data); // prints coordinates in geoJSON format 

}).catch(err =>
	console.log(err) // id not found  
);

// return the data as type POINT, and include FIELDS as well.  
client.get('fleet', 'truck2', { type: 'POINT', withfields: true }).then(data => {
	console.log(`truck2 is at ${data.point.lat},${data.point.lon}`);
	console.dir(data.fields);
});

return ;

// simulate
map_bounds = [37.6930029, -122.33026355, 37.844208, -122.153541];

// return a random coordinate inside given bounds
function randomPointInBounds(swLat, swLon, neLat, neLon) {
	let randLat = Math.random() * (neLat - swLat) + swLat;
	let randLon = Math.random() * (neLon - swLon) + swLon;
	return [randLat, randLon];
}

setInterval(() => {
	client.set('fleet', "truck2", randomPointInBounds(...map_bounds));
}, 1000);

/*
 * create a live geofence to receive updates when object enter/exit an area within 2000m radius of a point. 
 */
const nearPiedmont = client.nearbyQuery('eastbay').detect('enter', 'exit').objects().point(37.822357, -122.232007, 2000);//.withinQuery('eastbay').detect('enter', 'exit').bounds(37.759704, -122.218763, 37.810648, -122.181591);
nearPiedmont.executeFence((err, results) => {
	if (err) {
		console.error(err);
	} else {
		console.log(results.id + ": " + results.detect + " Piedmond 2k radius: ", results);
		// console.dir(results);
	}
});
