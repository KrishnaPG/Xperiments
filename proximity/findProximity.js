const fs = require('fs');
const LatLong = require('./proximity');

// The below will crash if invalid JSON file is supplied, or file not found.
// The supplied sample json file does not seem to contain any header to 
// validate the file format or schema version. Use could supplied any other json file and no way to know it.
// For now we assume user has supplied the right json file. If not, application will crash.
const partners = JSON.parse(fs.readFileSync('partners.json')).sort((el1, el2) => el1.organization.localeCompare(el2.organization));

function parseLatLong(str) {
	const values = str.split(',');
	return new LatLong(values[0], values[1]);
}

// Lets find out who are within the required distance and print them
const basePoint = new LatLong(51.515419, -0.141099);
const maxDistance = 100;

// This is not the most efficient way of doing it. Optimally these offices
// should be put inside a DB and indexed by their latLong coords. For now, we just take 
// the brute force approach, since the offices are just handful.
//
// Also, in the question it was not specified how to treat duplicates. 
// i.e. if two offices of same company fall within the distance, should it
// be considered as duplicate (because it is same company), or not (because
// the offices are different). For now, we go with the second scenario and
// allow multiple offices of same company to be invited. If only one invite
// should be sent per company, then a check for duplicate can be made easily, if required.
const invitees = new Map();
partners.forEach(partner => {
	partner.offices.forEach(office => {
		if (basePoint.isPointWithinDistance(parseLatLong(office.coordinates), maxDistance)) {
			if (!invitees.has(partner.organization))
				invitees.set(partner.organization, []);
			invitees.get(partner.organization).push(office);
		}
	})
});

// print the invites
console.log(`Inviting all partners with in the range of ${maxDistance}km from (${basePoint.latitude}, ${basePoint.longitude})`);
console.log("---------Invitees-----------");
for (let [org, offices] of invitees) {
	console.log(`${org}`);
	offices.forEach(office => console.log(`    ${office.address}`));
}
	
