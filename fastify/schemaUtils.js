const $extends = (...args) => Object.assign({}, ...args);

const firstName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });
const lastName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });

const pk = (type = "uuid") => ({ type, nullable: false, unique: false, primaryKey: true, index: true });
const unique_pk = (type = "uuid") => ({ type, nullable: false, unique: true, primaryKey: true, index: true });
const fk = (foreignKey, relation = "ManyToOne") => ({ type: "fk", foreignKey, relation });

const namedEntity = Object.freeze({
	firstName: firstName,
	lastName: lastName
});
const autoInc = Object.freeze({
	id: { type: "increments", nullable: false, primaryKey: true, index: true }	// no need to set unique
});
const idCol = Object.freeze({
	id: unique_pk(),
});
const trackModify = Object.freeze({
	createdAt: "dateTime",
	modifiedAt: "dateTime"
});
const timeBound = $extends(trackModify, {
	expiresAt: "dateTime",
	status: ["Not Started", "Postponed", "InProgress", "Cancelled", "Completed"]
});

module.exports = {
	builtIns: { namedEntity, autoInc, idCol, trackModify, timeBound, pk, unique_pk, fk },
	$extends	
}