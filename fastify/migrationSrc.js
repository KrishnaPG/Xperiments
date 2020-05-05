const CBOR = require('cbor');
const Knex = require('knex');
const Sodium = require('sodium-native');
const { runScript: strToMigrationModule } = require('./runScript');

class MigrationSource {
	constructor(migrationsDB, activeRecordsLimit) {
		this.migrationsDB = migrationsDB;
		this.activeRecordsLimit = activeRecordsLimit;
		this.cache = new Map();	// holds the compiled source modules loaded from database
		this.verifyDBEntry = true;
	}

	static _Defaults = {
		DB_Config: {
			client: 'sqlite3',
			connection: {
				filename: __dirname + '/migrations.sqlite'
			},
		},
		getUniqueStr: () => ((new Date()).toISOString() + Math.ceil(Math.random() * 100000)), // allows sorting time-wise, with a random piece at the end to make it unique
	};

	static _bufHash = Buffer.alloc(Sodium.crypto_generichash_BYTES);
	static getHash = (srcStr) => {
		Sodium.crypto_generichash(MigrationSource._bufHash, Buffer.from(srcStr));
		return MigrationSource._bufHash.toString("base64");
	};

	static _TableName = "source";
	static create(knexConfig = MigrationSource._Defaults.DB_Config, activeRecordsLimit = 10) {
		const migrationsDB = Knex(knexConfig);
		return migrationsDB.schema.hasTable(MigrationSource._TableName).then(exists => {
			return exists ? new MigrationSource(migrationsDB, activeRecordsLimit) : migrationsDB.schema.createTable(MigrationSource._TableName, t => {
				t.increments('id').primary().unique().notNullable();
				t.string("name", 32).index().unique().notNullable();
				t.text("source").notNullable(); // the knex migration module code
				t.string("sourceHash", 48).index().unique().notNullable();
				t.text("sourceInput").notNullable(); // normalized tables.  Source modules are generated from this.
				t.text("sourceRaw").nullable(); // the json raw schema that was used in generating the migration code
				t.datetime("createdAt", { precision: 6 }).index().notNullable();
				t.string("createdBy", 32).index().nullable();
				t.text("notes").nullable();
			}).then(() => new MigrationSource(migrationsDB, activeRecordsLimit));
		});
	}

	close(onCloseCB) {
		if (this.migrationsDB) {
			this.migrationsDB.destroy(onCloseCB);
		}
	}

	_readMigrationSrcFromDB(query) {
		return this.migrationsDB.select().from(MigrationSource._TableName).where(query).limit(1).then(result => {
			if (!result || result.length <= 0)
				throw new Error(`Loading migration with query: ${query} has no results`);
			const dbEntry = result[0];
			if (this.verifyDBEntry) {
				if (MigrationSource.getHash(dbEntry.source) !== dbEntry.sourceHash)
					throw new Error(`Integrity check failed while loading migration source for ${query} `);
			}
			return dbEntry.source;
		});
	}

	// custom methods
	addMigration(strUp, strDown, normalizedTables, rawSchema, name = MigrationSource._Defaults.getUniqueStr()) {
		const source = `up = knex => { ${strUp}	},	down = knex => {	${strDown} }`;
		const m = {
			name,
			source,
			sourceHash: MigrationSource.getHash(source),
			sourceInput: CBOR.encode(normalizedTables), // the normalized tables that were generated from raw Schema, which produced the strUp/strDown
			//sourceRaw: CBOR.encode(rawSchema), // the one supplied by user (simplified JSON format of schema), before normalizing
			createdAt: new Date(),
			createdBy: "<TODO: current user>",
			notes: ""
		};
		return this.migrationsDB.insert(m).into(MigrationSource._TableName);
	}

	// Required methods

	// Must return a Promise containing an array of migration IDs. 
	// Returned values can be whatever you want, they will be passed as
	// arguments to getMigrationName() and getMigration(). 
	// For simplicity, we are returning array of names directly.
	getMigrations() {
		return this.migrationsDB.select("name").from(MigrationSource._TableName).limit(this.activeRecordsLimit).then(result => {
			console.log("getMigrations result: ", result);
			return result.map(dbEntry => dbEntry.name);
		});
	}

	getMigrationName = id => id // in our case we are using names as IDs

	getMigration(name) {
		console.log("getmigration for: ", name);
		if (!this.cache.has(name)) {
			return this._readMigrationSrcFromDB({ name }).then(src => {
				const context = { up: null, down: null };
				const module = strToMigrationModule(src, context); // convert to callable module, which will be invoked when knex.migrate.latest() is called
				this.cache.set(name, module);
				return module;
			});
		}
		return Promise.resolve(this.cache.get(name));
	}
};

module.exports = MigrationSource;