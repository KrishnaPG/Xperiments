const Knex = require('knex');
const MigrationSource = require('./migrationSrc');

const { normalizeTables, generateMigrationString, isRelationTable } = require('./migrationGen');
const { builtIns, $extends } = require('./schemaUtils');
const { runScript: strToMigrationModule } = require('./runScript');

const { tables } = require('./schemas');

const MetaBase = require('./meta');





MetaBase.init().then(metaDB => {
	//console.log("metaDB: ", metaDB);

	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' }
	});

	return metaDB.runMigration(knex, tables)
		.catch(ex => console.error(`Failure: `, typeof ex === "string" ? ex : ex.message))
		.finally(() => {
			knex.destroy();
			metaDB.close();
		});
}).catch(ex => console.error(typeof ex === "string" ? ex : ex.message));


/*
MigrationSource.create().then(migrationSource => {
	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' },
		migrations: { migrationSource }
	});

	const normalizedTables = normalizeTables(tables); console.log(" normalized tables: ", normalizedTables); process.exit(0);
	const { strUp, strDown } = generateTables(normalizedTables);

	return migrationSource.addMigration(strUp, strDown, normalizedTables, tables)
		.catch(ex => console.error("Failed to add Migration"))
		.then(() => knex.migrate.latest())
		.then(() => knex.migrate.list())
		.then(list => {
			console.log("migration list: ", JSON.stringify(list));
		})
		.catch(ex => console.error(ex))
		.finally(() => {
			knex.destroy();
			migrationSource.close();
		});
}); */