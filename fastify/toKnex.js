const Knex = require('knex');
const MetaBase = require('./meta');

const { tables } = require('./schemas');
const { callOnCollection } = require('./collectionAPI');


MetaBase.init().then(metaBase => {
	//console.log("metaDB: ", metaDB);

	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' },
		useNullAsDefault: true
	});

	return metaBase.runMigration(knex, tables)
		.then(record => { if (record) console.log("Migration skipped, record already exists: ", record); })
		.catch(ex => console.error(`Failure: `, typeof ex === "string" ? ex : ex.message))
		.then(() => {
			return callOnCollection(metaBase.db, knex, "customer", "insertOne", require('./data').customer);
		})
		.finally(() => {
			knex.destroy();
			metaBase.close();
		});
}).catch(ex => console.error(ex));
