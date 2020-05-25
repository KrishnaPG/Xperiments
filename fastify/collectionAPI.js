const ObjectPath = require('object-path');
const { getSequentialIds } = require('./utils');
const { supportedFieldTypes } = require('./migrationGen');

function bindData(sqlBindings, data) {
	return sqlBindings.map(param => {
		const val = ObjectPath.get(data, param);
		if (!val) {
			if (param == "id") return getSequentialIds(1)[0];
			throw new Error(`value for "${param}" is not supplied in data: ${JSON.stringify(data, null, " ")}`);
		}
		return val;
	});
}

class Collection {
	constructor(metaDB, knex) {
		this.metaDB = metaDB;
		this.knex = knex;
		this.timeout = 5000;
	}
	getBaseFields(collName) {		
	}
	getMethodQuery(schepeFilter, method) {
		return this.metaDB.select(method).from("schepes").where(schepeFilter).limit(1).then(results => {
			if (!results || results.length <= 0) throw new Error(`UnKnown schepe for Collection::getMethodQuery(${schepeFilter}, ${method})`);
			return JSON.parse(results[0][method]);
		});
	}
	// invokeMethod(collName, method, data) {
	// 	return this.getMethodQuery(collName, method).then(query => {
	// 		const bindings = bindData(query.bindings, data);
	// 		console.log("query: ", query, bindings);
	// 		return this.knex.raw(query.sql, bindings).timeout(this.timeout);
	// 	});
	// }
	insertBase(schepeFilter, data) {
		return this.getMethodQuery(schepeFilter, "baseInsert").then(query => {
			const bindings = bindData(query.bindings, data);
			console.log(`${collName} query: `, query, bindings);
			return this.knex.raw(query.sql, bindings).timeout(this.timeout).then(() => data.id);
		});
	}
	insertOne(schepeFilter, data) {
		this.metaDB.select().from("schepes").where(schepeFilter).limit(1).then(results => {
			const schepe = results[0];
			const promises = [];
			const fkFields = JSON.parse(schepe.fkFields);
			for (let [fld, fldDefn] of Object.entries(fkFields)) {
				if (fldDefn.isArray) continue; // skip array fields for now
				const p = this.insertOne({ id: fldDefn.type }, ObjectPath.get(data, fld)).then(results => {
						ObjectPath.set(data, fld, results[0]); // replace the object with foreignKey ID
				});
				promises.push(p);
			}
			return Promise.all(promises).then(() => {
				// foreignKeys are replaced with their IDs in the data now. Insert the base object
				return this.insertBase(schepeFilter, data);
			}).then(baseId => {
				// base object is inserted along with all foreignKey fields.
				// We now have to take care of array fields. Array fields could be simple fields or
				// foreignKey fields. In either case they are stored in a separate relation Table.
				const arrFields = JSON.parse(schepe.relationFields);
				const arrPromises = [];
				for (let [fld, fldDefn] of Object.entries(arrFields)) {
					if (supportedFieldTypes(fldDefn.type)) // if it is native type just insert the objects directly into the relation table
					{
						const values = ObjectPath.get(data, fld);
						if (!values || !Array.isArray(values))
							throw new Error(`${schepeFilter}.${fld} is expected to be an array, but found ${JSON.stringify(values, null, " ")}`);
						const rows = [];
						const fieldName = fld.replace(/\./g, '_');
						const thisName = schepe.name;
						values.forEach(val => rows.push({ [fieldName]: val, [thisName]: baseId }));
						arrPromises.push() //TODO: add rows to the relation Table using Knex
					}
				}
			})
		});
	}
};

module.exports = Collection;
