const { builtIns, $extends } = require('./schemaUtils');

// id, mtlId should not be explicitly specified. They will be added by default.
// At the schema level they will not be visible. However, at the database level
// they are required to be populated for the record (our API or dbDriver should
// create those values while saving our record).
// Attributes such as createdAt, modifiedAt may also need not be specified at the
// schema level. Rather they should be tracked separately in a log database.

const latLongFn = () => ({
	name: "latLong",
	type: "object",
	properties: {
		lat: { type: "float", nullable: false, min: -90, max: 90  },
		long: { type: "float", nullable: false, min: -180, max: 180 }
	},
	serDe: {
		fromString: (str) => { const latLongStr = str.split(','); return { lat: parseFloat(latLongStr[0]), long: parseFloat(latLongStr[1]) } },
		toString: (obj) => `${obj.lat},${obj.long}`
	}
});
const latLong = { type: "geoPoint", index: true };

const tables = {
	"customer": $extends(builtIns.namedEntity, {
		role: { type: "enum", values: ["provider", "consumer"] },
		addresses: ["address"]
	}),
	"serviceOffered": {
		title: "string",
		description: "richText",		
		hourlyRate: "float",
		image: "url",
		location: latLong,
		tags: ["string"],
		offeredBy: builtIns.fk("customer", "ManyToOne")
	},
	"serviceRequested": $extends(builtIns.timeBound, {
		title: "string",
		description: "richText",
		hourlyRate: "float",
		image: "url",
		location: latLong,
		tags: ["string"],
		requestedBy: builtIns.fk("customer", "ManyToOne"),
	}),
	"tag": {
		name: builtIns.unique_pk("string")
	},
	"post": $extends(builtIns.trackModify, {
		"author": builtIns.fk("customer"),
		"keywords": ["string"],
		"content": "richText"
	}),
	"address": {
		"type": { type: "enum", values: ["Home", "Office"] },
		"street": "string",
		"city": "string",
		"country": "string",
		"map": {
			"geo": {
				"location": latLong
			}
		}
	}
};

module.exports = {
	tables
};