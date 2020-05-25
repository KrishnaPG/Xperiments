const Merge = require('lodash.merge')

const CollectionAPI = require('./collectionAPI');
const { getSequentialIds } = require('./utils');

const defaultFns = {
	insertOne: "", findOne: "", findMany: ""
};


class CollectionGen {
	constructor(metaDB, knex) {
		this.metaDB = metaDB;
		this.knex = knex;
		this.timeout = 5000;
	}
	generateCollections(schepes, fields, normalizedTables) {
		const ids = getSequentialIds(schepes.length);
		const coll = schepes.map((schepe, index) => {
			const sColl = this.generateCollection(schepe, fields.filter(field => field.schepe == schepe.id), normalizedTables);
			sColl.id = ids[index];
			sColl.builtIn = true;
			return sColl;
		});
		return coll;
	}
	generateCollection(schepe, fields, normalizedTables) {
		const baseFields = JSON.parse(schepe.baseFields);
		const fkFields = JSON.parse(schepe.fkFields);
		const relationFields = JSON.parse(schepe.relationFields);

		const coll = Merge({ name: schepe.name, schepe: schepe.id }, defaultFns);

		const baseRecord = {}; /*baseFields.reduce((obj, field) => {
			obj[field.name] = field.pathInInput ? field.pathInInput : field.name;
			return obj;
		}, {});*/
		
		coll.insertOne = JSON.stringify(this.knex(schepe.name).insert(baseRecord).toSQL().toNative());

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
}

module.exports = CollectionGen;