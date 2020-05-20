require('./base58');

const CBOR = require('borc');
const Knex = require('knex');
const Merge = require('lodash.merge')
const Sodium = require('sodium-native');

const { generateMigrationStrings, isRelationTable } = require('./migrationGen');
const { builtIns, $extends } = require('./schemaUtils');
const { runScript: strToMigrationModule } = require('./runScript');
const { generateCollections } = require('./collectionGen');
const { getSequentialIds } = require('./utils');

// Notes:
// 	normalizedTables: user given tables + derived relation tables, each with normalized type definitions
// 	schepes: normalized base tables with foreign keys directly inside them (no derived relation tables)
// 	collections: data access objects for the schepes

// Nullable is false by default

const meta = {
	schepes: $extends(builtIns.idHashCol, builtIns.trackModify, {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schema: "text",
		validation: "text",	// validation in JSON-schema format
	}),
	fields: $extends(builtIns.idCol, builtIns.trackModify, {
		name: { type: "string", index: true, nullable: false, max: 64 },	// can have long nested fields
		schepe: "schepes",
		type: { type: "string", index: true, nullable: false, max: 48 },	// should be long enough to hold hashIDs
		index: "boolean",
		nullable: "boolean",
		unique: "boolean",
		primaryKey: "boolean",
		default: { type: "text", nullable: true },
		foreignKey: { type: "string", nullable: true, index: true },
		format: { type: "string", nullable: true, index: true },
		min: { type: "integer", nullable: true },
		max: { type: "integer", nullable: true },
		pattern: { type: "string", nullable: true },	// only when format = "regex"
		values: { type: "text", nullable: true },			// only when type = "enum"
		isArray: { type: "boolean", nullable: true, index: true },
		relationTable: { type: "string", nullable: true, index: true },	// only valid when isArray is true
		pathInInput: { type: "string", nullable: true, index: true } // for nested types the path of the field in the input record
	}),
	migrations: $extends(builtIns.idHashCol, // == hash of cborNormTables
	{		 
		cborNormTables: "text",	// CBOR representation of normalized tables (user provided schepe definitions)
		strUp: "text",
		strDown: "text",
		executedAt: "dateTime"
		}),
	collections: $extends(builtIns.idCol, {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schepe: "schepes",
		insertOne: "jsonb",
		findOne: "jsonb",
		findMany: "jsonb"
	})
};


function getTableNameFromForeignKey(foreignKey) {
	return foreignKey.split(".", 1)[0];
}

function prepareMetadata(normalizedTables) {
	const tablesMeta = {};
	const fieldsMeta = [];
	const relationTables = {};
	const createdAt = new Date();
	const modifiedAt = createdAt;
	const fieldDefaults = { index: false, nullable: false, unique: false, primaryKey: false, createdAt, modifiedAt };
	
	// first give ids to all tables. IDs are based on hash of the table definition
	for (let [tbl, tblDefn] of Object.entries(normalizedTables)) {
		// we do not track the derived relation tables in the metaDB
		if (!isRelationTable(tbl)) {
			// this is a normal table. Create an ID for it based on its definition's hash
			const cborDefn = CBOR.encode(tblDefn);
			tablesMeta[tbl] = {
				name: tbl,
				id: MetaBase._getHash(cborDefn),
				createdAt, modifiedAt,
				schema: JSON.stringify(tblDefn, null, " "),
				validation: "{}"
			};
		}
	}
	
	// create the fields Meta
	for (let [tbl, tblMeta] of Object.entries(tablesMeta)) {
		const tblDefn = normalizedTables[tbl];
		const schepe = tblMeta.id;
		const fieldNames = Object.keys(tblDefn);
		const fieldCount = fieldNames.length;
		const ids = getSequentialIds(fieldCount); // plus one for the table itself
		
		for (let i = 0; i < fieldCount; ++i) {
			const name = fieldNames[i];
			const fldDefn = tblDefn[name];
			fieldsMeta.push(Merge({}, fieldDefaults, fldDefn, { name, schepe, id: ids[i] }));
			
			// resolve the schepe references for array foreign key fields
			if (fldDefn.isArray && fldDefn.foreignKey) {
				const fldDefn = fieldsMeta[fieldsMeta.length - 1];
				const referredSchepe = tablesMeta[fldDefn.type];
				if (!referredSchepe) {
					throw new Error(`${tbl}.${fld} is an array type of "${fldDefn.type}" that cannot be resolved. \n${JSON.stringify(fldDefn, null, "  ")}`);
				}
				fldDefn.type = referredSchepe.id;
			}
		}
	}

	return {
		schepes: Object.values(tablesMeta),
		fields: fieldsMeta
	};
}

class MetaBase {
	constructor(metaDB) {
		this.db = metaDB;		
	}
	
	static _Defaults = {
		DB_Config: {
			client: 'sqlite3',
			connection: {
				filename: __dirname + '/meta.sqlite'
			},
			useNullAsDefault: true
		}
	};

	static _bufHash = Buffer.alloc(Sodium.crypto_generichash_BYTES);
	static _getHash = (srcStr) => {
		Sodium.crypto_generichash(MetaBase._bufHash, Buffer.from(srcStr));
		return MetaBase._bufHash.toBase58();
	};
	
	static init(knexConfig = MetaBase._Defaults.DB_Config) {
		const metaDB = Knex(knexConfig);
		return metaDB.schema.hasTable("schepes").then(exists => {
			if (!exists) {
				const { strUp, strDown } = generateMigrationStrings(meta);
				const migStr = `up = knex => { ${strUp}	},	down = knex => {	${strDown} }`;
				const context = { up: null, down: null };
				const migModule = strToMigrationModule(migStr, context); // convert to callable module
				return migModule.up(metaDB);
			}
			return true;
		}).catch(ex => {
			if (metaDB) metaDB.destroy();
			throw new Error(`MetaBase.init() failed: ${ex.message}`);
		}).then(() => new MetaBase(metaDB));
	}

	close(onCloseCB) {
		if (this.db)
			this.db.destroy(onCloseCB);
	}

	runMigration(knex, tables) {
		const { strUp, strDown, normalizedTables } = generateMigrationStrings(tables, false);
		const cborNormTables = CBOR.encode(normalizedTables);
		const id = MetaBase._getHash(cborNormTables);
		
		const { schepes, fields } = prepareMetadata(normalizedTables);
		const collections = generateCollections(knex, schepes, fields, normalizedTables);
		// console.log("collections: ", collections);
		// console.log("strUp: ", strUp);
		// console.log("strDown: ", strDown);
		// console.log("schepes: ", JSON.stringify(schepes, null, "  "));
		// console.log("fields: ", JSON.stringify(fields, null, "  "));		

		return this.db.select("id").from("migrations").where({ id }).limit(1).then(result => {
			if (result && result.length >= 1) return result[0]; // avoid duplicates

			const { schepes, fields } = prepareMetadata(normalizedTables);
			const migStr = `up = knex => { ${strUp}	},	down = knex => {	${strDown} }`;
			const context = { up: null, down: null };
			const migModule = strToMigrationModule(migStr, context); // convert to callable module

			return this.db.transaction(trx => {
				// save the migration scripts, and meta data first
				const migrationObj = { id, cborNormTables, strUp, strDown, executedAt: new Date() };
				return this.db.insert(migrationObj).into("migrations").transacting(trx)
					.then(() => this.db.insert(schepes).into("schepes").transacting(trx))
					.then(() => this.db.insert(fields).into("fields").transacting(trx))
					.then(() => this.db.insert(collections).into("collections").transacting(trx))
					.then(() => migModule.up(knex))	// execute the migration
					.then(() => trx.commit())
					.catch(ex => migModule.down(knex).then(() => trx.rollback(ex)));	// rollback the migration and metadata inserts
			});
		});
	}
}

module.exports = MetaBase;