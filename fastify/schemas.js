
const firstName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });
const lastName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });
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

const pk = (type = "uuid") => ({ type, nullable: false, unique: false, primaryKey: true, index: true });
const unique_pk = (type = "uuid") => ({ type, nullable: false, unique: true, primaryKey: true, index: true });
const fk = (foreignKey, relation = "ManyToOne") => ({ type: "fk", foreignKey, relation });

const $extends = (...args) => Object.assign({}, ...args);

const namedEntity = Object.freeze({
	firstName: firstName,
	lastName: lastName
});
const idCol = Object.freeze({
	id: unique_pk,
});
const trackModify = Object.freeze({
	createdAt: "dateTime",
	modifiedAt: "dateTime"
});
const timeBound = $extends(trackModify, {
	expiresAt: "dateTime",
	status: ["Not Started", "Postponed", "InProgress", "Cancelled", "Completed"]
});

const tables = {
	"customer": $extends(namedEntity, idCol, {
		role: { type: "enum", values: ["provider", "consumer"] },
		addresses: ["address"]
	}),
	"serviceOffered": {
		id: unique_pk,
		offeredBy: fk("customer.id", "ManyToOne"),
		location: latLong,
		tags: [fk("tag.name", "ManyToMany")]
	},
	"serviceRequested": $extends(timeBound, idCol, {
		requestedBy: fk("customer", "ManyToOne"),
		tags: [fk("tag.name", "ManyToMany")]
	}),
	"tag": {
		name: unique_pk("string")
	},
	"post": $extends(idCol, trackModify, {
		"author": fk("customer"),
		"keywords": ["string"]
	}),
	"address": $extends(idCol, {
		"street": "string",
		"map": {
			"geo": {
				"location": latLong
			}
		}
	})
};

module.exports = {
	tables,
	builtIns: { namedEntity, idCol, trackModify, timeBound },
	$extends
};