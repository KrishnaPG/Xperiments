const Knex = require('knex');
const MetaBase = require('./meta');

const { tables } = require('./schemas');
const { generateCollections } = require('./collectionGen');


MetaBase.init().then(metaDB => {
	//console.log("metaDB: ", metaDB);

	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' },
		useNullAsDefault: true
	});

	return metaDB.runMigration(knex, tables)
		.catch(ex => console.error(`Failure: `, typeof ex === "string" ? ex : ex.message))
		.then(record => console.log("Migration skipped, record already exists: ", record))
		.finally(() => {
			knex.destroy();
			metaDB.close();
		});
}).catch(ex => console.error(typeof ex === "string" ? ex : ex.message));
