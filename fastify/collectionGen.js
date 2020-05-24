const Merge = require('lodash.merge')

const { getSequentialIds } = require('./utils');

const defaultFns = {
	insertOne: "", findOne: "", findMany: ""
};

function generateCollection(knex, schepe, fields, normalizedTables) {
	const coll = Merge({ name: schepe.name, schepe: schepe.id }, defaultFns);
	const baseFields = fields.filter(field => !field.relationTable);
	const fkFields = fields.filter(field => field.foreignKey);
	const relationFields = fields.filter(field => field.relationTable);

	const baseRecord = baseFields.reduce((obj, field) => {
		obj[field.name] = field.pathInInput ? field.pathInInput : field.name;
		return obj;
	}, {});

	// for each of the foreignKey fields, call insert on its schepe

	coll.insertOne = JSON.stringify(knex(schepe.name).insert(baseRecord).toSQL().toNative());
	relationFields.forEach(field => {
		// if field is type schepe, add record into that schepe table and use its ID
		// else add the field value directly in the relationTable
		knex()
	});
	return coll;

	// knex.transaction(trx => {
	// 	knex(schepe.name).insert(baseObj, "id").transacting(trx)
	// 		.then(ids => {
	// 			const baseId = ids[0];
	// 			return Promise.all(relationFields.forEach(field => {
	// 				// create new objects for the related type (e.g. addresses for this customer)				
	// 				const relatedIds = insertMany(field.type, record[field.name]);
	// 				// track the many-to-many relations in the dedicated relation table (e.g. customerID, addressID)
	// 				const relObjs = relatedIds.map(relId => { [tbl]: baseId, [field.type -> name]: relId });
	// 				insertMany(field.relationTable, relObjs);
	// 			}));
	// 		}).then(() => trx.commit())
	// 		.catch(() => trx.rollback());
	// });
}


function generateCollections(knex, schepes, fields, normalizedTables)
{
	const ids = getSequentialIds(schepes.length);
	const coll = schepes.map((schepe, index) => {
		const sColl = generateCollection(knex, schepe, fields.filter(field => field.schepe == schepe.id), normalizedTables);
		sColl.id = ids[index];
		sColl.builtIn = true;
		return sColl;
	});
	return coll;
}

module.exports = {
	generateCollections
}