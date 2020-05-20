const ObjectPath = require('object-path');
const { getSequentialIds }= require('./utils');

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

function callOnCollection(metaDB, knex, collName, method, data) {
	return metaDB.select(method).from("collections").where({ name: collName }).then(results => {
		if (!results || results.length <= 0) throw new Error(`callOnCollection(): unKnown collection name "${collName}"`)
		const query = JSON.parse(results[0][method]);
		const bindings = bindData(query.bindings, data);
		console.log("query: ", query, bindings);
		return knex.raw(query.sql, bindings);
	});
}

module.exports = {
	callOnCollection
};