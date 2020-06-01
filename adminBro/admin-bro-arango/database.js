const { BaseDatabase } = require('admin-bro');


class Database extends BaseDatabase {
	static isAdapterFor(connection) {
		//TODO: find out a way to identify if the connection is indeed an ArangoDB connection and not something else
		return true; // connection.constructor.name === 'ArangoDB'
	}

	constructor(connection) {
		super(connection)
		this.connection = connection
	}

	// resources() {
	// 	return this.connection.listCollections().map(name => (
	// 		new Resource(this.connection.model(name))
	// 	))
	// }	
};

module.exports = Database;