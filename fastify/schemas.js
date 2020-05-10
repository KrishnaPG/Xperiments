const { builtIns, $extends } = require('./schemaUtils');

const latLong = () => ({
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

const tables = {
	"customer": $extends(builtIns.namedEntity, builtIns.idCol, {
		role: { type: "enum", values: ["provider", "consumer"] },
		addresses: ["address"]
	}),
	"serviceOffered": {
		id: builtIns.unique_pk(),
		offeredBy: builtIns.fk("customer.id", "ManyToOne"),
		location: latLong,
		tags: [builtIns.fk("tag.name", "ManyToMany")]
	},
	"serviceRequested": $extends(builtIns.timeBound, builtIns.idCol, {
		requestedBy: builtIns.fk("customer", "ManyToOne"),
		tags: [builtIns.fk("tag.name", "ManyToMany")]
	}),
	"tag": {
		name: builtIns.unique_pk("string")
	},
	"post": $extends(builtIns.idCol, builtIns.trackModify, {
		"author": builtIns.fk("customer"),
		"keywords": ["string"]
	}),
	"address": $extends(builtIns.idCol, {
		"street": "string",
		"map": {
			"geo": {
				"location": latLong
			}
		}
	})
};

module.exports = {
	tables
};