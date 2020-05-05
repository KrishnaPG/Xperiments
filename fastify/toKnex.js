const Knex = require('knex');
const MigrationSource = require('./migrationSrc');
const { normalizeTables, generateTables } = require('./migrationGen');

const { tables } = require('./schemas');

// console.log(strUp);
// console.log(strDown);
// console.log(normalizedTables);

// const context = { up: null, down: null };
// runScript(`
// 	up = knex => { ${strUp}	},
// 	down = knex => {	${strDown} }
// `, context);

MigrationSource.create().then(migrationSource => {
	const knex = Knex({
		client: 'sqlite3',
		connection: { filename: __dirname + '/db.sqlite' },
		migrations: { migrationSource }
	});

	const normalizedTables = normalizeTables(tables);
	const { strUp, strDown } = generateTables(normalizedTables);

	return migrationSource.addMigration(strUp, strDown, normalizedTables, tables)
		.catch(ex => console.error("addMigration error: ", ex.message))
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
});