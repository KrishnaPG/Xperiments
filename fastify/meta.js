const { performance } = require('perf_hooks');

const CBOR = require('borc');
const Knex = require('knex');
const Sodium = require('sodium-native');

const { generateMigrationStrings, isRelationTable } = require('./migrationGen');
const { builtIns, $extends } = require('./schemaUtils');
const { runScript: strToMigrationModule } = require('./runScript');
const { generateCollections } = require('./collectionGen');

// Nullable is false by default

const meta = {
	tables: $extends(builtIns.idCol, builtIns.trackModify, {
		name: { type: "string", unique: true, nullable: false, index: true, max: 64 }
	}),
	relations: $extends(builtIns.idCol, {
		table: "tables"
	}),
	fields: $extends(builtIns.idCol, builtIns.trackModify, {
		name: { type: "string", index: true, nullable: false, max: 64 },
		table: "tables",
		type: { type: "string", index: true, nullable: false, max: 16 },
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
		isArray: { type: "boolean", nullable: true },
		joinTable: { type: "string", nullable: true }	// only valid when isArray is true
	}),
	migrations: {
		id: { type: "string", max: 48, primaryKey: true, index: true, unique: true, nullable: false }, // == hash of normTables
		cborNormTables: "text",	// CBOR representation of normalized tables
		strUp: "text",
		strDown: "text",
		executedAt: "dateTime"
	}
};


// maximum supported at a given time is ten million entries
function getSequentialIds(nCount = 1, idStrLength = 36) {
	const ids = [];
	const NumBase = 36;
	const Now = Math.ceil((performance.now() + performance.timeOrigin) * 1000);
	const timestamp = Now.toString(NumBase); // 10 chars in base 36
	const fingerprint = (typeof process !== "undefined" ? process.pid : Math.random()) + performance.timeOrigin;
	const Rand = Math.random() * fingerprint;
	for (let i = 0; i < nCount; ++i) {
		const seqNum = i.toString(NumBase).padStart(5, 0); //  10,000,000 in base36 is "5yc1s"
		const randPart = Math.ceil(Rand * performance.now()).toString(NumBase);// roughly 14 base36 chars
		const rand2 = Math.ceil(Math.random() * 2 ** 20).toString(NumBase);	// maximum 4 base36 chars
		ids.push(`${timestamp}-${seqNum}-${randPart}-${rand2}`.padEnd(idStrLength, 0));
	}
	return ids;
}

function getTableNameFromForeignKey(foreignKey) {
	return foreignKey.split(".", 1)[0];
}

function prepareMetadata(normalizedTables) {

	const tablesMeta = {};
	const fieldsMeta = [];
	const pendingTables = {};
	const createdAt = new Date();
	const modifiedAt = createdAt;
	const fieldDefaults = { index: false, nullable: false, unique: false, primaryKey: false, createdAt, modifiedAt };
	
	for (let [tbl, tblDefn] of Object.entries(normalizedTables)) {
		const parsed = isRelationTable(tbl);
		if (!parsed) { // this is a normal table
			const fieldNames = Object.keys(tblDefn);
			const fieldCount = fieldNames.length;
			const ids = getSequentialIds(fieldCount + 1); // plus one for the table itself
			for (let i = 0; i < fieldCount; ++i) {
				const name = fieldNames[i];
				fieldsMeta.push(Object.assign({}, fieldDefaults, tblDefn[name], { name, table: ids[0], id: ids[i + 1] }));
			}
			tablesMeta[tbl] = { name: tbl, id: ids[0], createdAt, modifiedAt };
		}
		else { // this is a new table generated to track many-to-many relations
			pendingTables[tbl] = parsed;
		}
	}
	
	for (let [tbl, parsed] of Object.entries(pendingTables)) {
		const relationName = parsed.groups.relName;
		const relationDefn = Object.assign({}, normalizedTables[tbl]);
		delete relationDefn.id;
		const keys = Object.keys(relationDefn);
		if (keys.length != 2)
			throw new Error(`${tbl}: relation table with more than 2 fields is not supported. \n${tbl} = ${JSON.stringify(relationDefn)}`);
		const field1 = keys[0], field1Defn = relationDefn[field1];
		const field2 = keys[1], field2Defn = relationDefn[field2];
		// verify the relation name
		if (`${field1}_${field2}` !== relationName && `${field2}_${field1}` !== relationName)
			throw new Error(`${tbl}: unable to verify the relation name "${relationName}"`);
		// add the fields to the meta table
		if (field1Defn.foreignKey) { // use this as table and the other as field
			const name = field2;
			const table = tablesMeta[getTableNameFromForeignKey(field1Defn.foreignKey)].id;
			const existingEl = fieldsMeta.find(el => el.name === name && el.table === table);
			if (existingEl)
				throw new Error(`${field1} table already has a field named "${name}" and the relation ${tbl} is trying to add another. \n ${tbl} = ${JSON.stringify(relationDefn)} \n ${field1} = ${JSON.stringify(tablesMeta[field1])}`);
			fieldsMeta.push(Object.assign({}, fieldDefaults, field2Defn, { name, table, isArray: true, joinTable: tbl, id: getSequentialIds(1)[0] }));
		}
		if (field2Defn.foreignKey) { // use this as table and the other as field
			const name = field1;
			const table = tablesMeta[getTableNameFromForeignKey(field2Defn.foreignKey)].id;
			const existingEl = fieldsMeta.find(el => el.name === name && el.table === table);
			if (existingEl)
				throw new Error(`${field2} table already has a field named "${name}" and the relation ${tbl} is trying to add another. \n ${tbl} = ${JSON.stringify(relationDefn)} \n ${field2} = ${JSON.stringify(tablesMeta[field2])}`);
			fieldsMeta.push(Object.assign({}, fieldDefaults, field1Defn, { name, table, isArray: true, joinTable: tbl, id: getSequentialIds(1)[0] }));
		}
	}
	return {
		tablesMeta: Object.values(tablesMeta),
		fieldsMeta
	};
}

class MetaBase {
	constructor(metaDB) {
		this.metaDB = metaDB;		
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
		return MetaBase._bufHash.toString("base64");
	};
	
	static init(knexConfig = MetaBase._Defaults.DB_Config) {
		const metaDB = Knex(knexConfig);
		return metaDB.schema.hasTable("tables").then(exists => {
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
		if (this.metaDB)
			this.metaDB.destroy(onCloseCB);
	}

	runMigration(knex, tables) {
		const { strUp, strDown, normalizedTables } = generateMigrationStrings(tables, false);
		const cborNormTables = CBOR.encode(normalizedTables);
		const id = MetaBase._getHash(cborNormTables);
		return this.metaDB.select("id").from("migrations").where({ id }).limit(1).then(result => {
			if (result && result.length >= 1) return result[0]; // avoid duplicates

			const { tablesMeta, fieldsMeta } = prepareMetadata(normalizedTables);
			const migStr = `up = knex => { ${strUp}	},	down = knex => {	${strDown} }`;
			const context = { up: null, down: null };
			const migModule = strToMigrationModule(migStr, context); // convert to callable module

			return this.metaDB.transaction(trx => {
				// save the migration scripts, and meta data first
				const migrationObj = { id, cborNormTables, strUp, strDown, executedAt: new Date() };
				return this.metaDB.insert(migrationObj).into("migrations").transacting(trx)
					.then(() => this.metaDB.insert(tablesMeta).into("tables").transacting(trx))
					.then(() => this.metaDB.insert(fieldsMeta).into("fields").transacting(trx))
					.then(() => migModule.up(knex))	// execute the migration
					.then(() => trx.commit())
					.catch(ex => migModule.down(knex).then(() => trx.rollback(ex)));	// rollback the migration and metadata inserts
			});
		});
	}
}

module.exports = MetaBase;