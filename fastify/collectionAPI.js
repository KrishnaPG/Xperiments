const ObjectPath = require('object-path');
const { getSequentialIds } = require('./utils');

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
	getMethodQuery(collName, method) {
		return this.metaDB.select(method).from("collections").where({ name: collName }).then(results => {
			if (!results || results.length <= 0) throw new Error(`UnKnown collection name "${collName}" for Collection::getMethodQuery(${collName}, ${method})`);
			return JSON.parse(results[0][method]);
		});
	}
	invokeMethod(collName, method, data) {
		return this.getMethodQuery(collName, method).then(query => {
			const bindings = bindData(query.bindings, data);
			console.log("query: ", query, bindings);
			return this.knex.raw(query.sql, bindings).timeout(this.timeout);
		});
	}
};

module.exports = Collection;
