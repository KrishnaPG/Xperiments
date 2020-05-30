const MetaBase = require('./meta');

const { tables } = require('./schemas');
const Collection = require('./collectionAPI');

MetaBase.init().then(metaBase => {
	return metaBase.runMigration(tables)
		.then(record => {
			if (!record.status && record.executedAt)
				console.log("Migration skipped, record already exists: ", { _id: record._id, executedAt: record.executedAt });
			else
				console.log("Migration: ", record);
		})
		.then(() => {
			// const c = new Collection(metaBase.db, knex);
			// return c.invokeMethod("customer", "insertOne", require('./data').customer);
		})
		.catch(console.error)
		.finally(() => {
			metaBase.close();
		});	
}).catch(console.error);