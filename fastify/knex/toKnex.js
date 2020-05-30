const Knex = require('knex');
const MetaBase = require('./meta');

const { tables } = require('./schemas');
const Collection = require('./collectionAPI');


MetaBase.init().then(metaBase => {
	//console.log("metaDB: ", metaDB);

	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' },
		useNullAsDefault: true
	});

	return metaBase.runMigration(knex, tables)
		.then(record => { if (record) console.log("Migration skipped, record already exists: ", record); })
		.then(() => {
			const c = new Collection(metaBase.db, knex);
			return c.invokeMethod("customer", "insertOne", require('./data').customer);
		})
		.catch(console.error)
		.finally(() => {
			knex.destroy();
			metaBase.close();
		});
}).catch(console.error);
