const CBOR = require('borc');
const Merge = require('lodash.merge')

const { Database } = require('arangojs');
const MigrationStrings = require('./migrationGen');
const { builtIns, $extends } = require('./schemaUtils');
const { runScript: strToMigrationModule } = require('./runScript');
const { getSequentialIds } = require('./utils');
const CollectionGen = require('./collectionGen');

// Nullable is false by default

const meta = {
	"schepes": {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schema: "text",
		validation: "text",				// schema validation in JSON-schema format
		baseFields: "jsonb",			// field names array
		fkFields: "jsonb",				// field names array
		relationFields: "jsonb",	// field names array 
		baseInsert: "jsonb",			// query for base field insertion (does not tackle relation fields)
		migId: "string"						// the migration shortId. CollectionName = this.migId + "-" + this.name
	},
	"fields": {
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
	},
	"migrations": {
			shortId: "text",
			cborNormTables: "text",	// CBOR representation of normalized tables (user provided schepe definitions)
			strUp: "text",
			strDown: "text",
			executedAt: "dateTime"
		},
	"collections": {
		name: { type: "string", unique: true, nullable: false, index: true, max: 32 },
		schepe: "schepes",
		insertOne: "jsonb",
		findOne: "jsonb",
		findMany: "jsonb",
		builtIn: "boolean"	// is this a builtIn collection or user-defined?
	}
};

function getTableNameFromForeignKey(foreignKey) {
	return foreignKey.split(".", 1)[0];
}

function isBaseField(field) {
	return !field.foreignKey && !field.relationTable;
}

class MetaBase {
	constructor(metaDB, idField, keyField, rayField) {
		this.db = metaDB;
		this.idField = idField || _Defaults.DB_Config.idField;
		this.keyField = keyField || _Defaults.DB_Config.keyField;
		this.rayField = rayField || _Defaults.DB_Config.rayField;
	}

	static _Defaults = {
		DB_Config: {
			url: "http://localhost:8529",
			dbName: "default",
			auth: {
				username: "test",
				password: "password"
			},
			idField: "_id",
			keyField: "_key",
			rayField: "_rayId"
		}
	};

	static init(dbConfig = MetaBase._Defaults.DB_Config) {
		const metaDB = new Database(dbConfig);

		metaDB.useDatabase(dbConfig.dbName);
		metaDB.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);
		
		const schepeColl = metaDB.collection("meta-schepes");
		return schepeColl.exists().then(exists => {
			if (!exists) {
				const mig = MigrationStrings.getId(meta);
				mig.shortId = "meta";
				const { migModule } = MetaBase.getMigModule(mig);
				return migModule.up(metaDB);
			}
			return true;
		}).catch(ex => {
			if (metaDB) metaDB.close();
			throw new Error(`MetaBase.init() failed: ${ex.message}, at ${ex.stack}`);
		}).then(() => new MetaBase(metaDB, dbConfig.idField, dbConfig.keyField, dbConfig.rayField));
	}

	static getMigModule(mig) {
		const m = new MigrationStrings(mig);
		const { strUp, strDown } = m.generate();
		const migStr = `up = ${strUp}, down = ${strDown}`;
		const context = { up: null, down: null };
		console.log("metaStr: ", migStr);
		return {
			migModule: strToMigrationModule(migStr, context), // convert to callable module
			strDown,
			strUp
		}
	}

	close(onCloseCB) {
		if (this.db)
			this.db.close();
	}

	runMigration(tables, rayId) {
		const mig = MigrationStrings.getId(tables, false, rayId);
		const _key = mig.shortId;
		const cborNormTables = mig.cborNormTables.toString();		
		const migColl = this.db.collection("meta-migrations");

		return migColl.firstExample({ _key }).catch(ex => {
			if (ex.isArangoError && ex.code == 404) { // record not found
				const { schepes, fields } = this.prepareMetadata(mig.normalizedTables, mig.shortId, mig.rayId);
				const { migModule, strUp, strDown } = MetaBase.getMigModule(mig);

				//const cGen = new CollectionGen(this.db, knex);
				const collections = []; //cGen.generateCollections(schepes, fields, normalizedTables);
				
				// prepare the field-schepe relation edges
				const g = this.db.graph(`mig-${mig.shortId}-${mig.rayId}`);
				const fldSchColl = g.edgeCollection("meta-fields-schepe");
				const fldSchIds = getSequentialIds(fields.length);
				const fldSchCollData = [["_key", "_from", "_to"]];
				fields.forEach((field, index) => fldSchCollData.push([fldSchIds[index], `meta-fields/${field._key}`, `meta-schepes/${field.schepe}`]));

				const schepeColl = this.db.collection("meta-schepes");
				const fieldColl = this.db.collection("meta-fields");
				const collColl = this.db.collection("meta-collections");
				// save the migration scripts, and meta data
				const migrationObj = { _key, cborNormTables, strUp, strDown, executedAt: new Date(), shortId: mig.shortId, rayId: mig.rayId };
				return this.db.beginTransaction({ read: [], write: [migColl, schepeColl, fieldColl, fldSchColl, collColl] }).then(trx => {
					return trx.run(() => schepeColl.import(schepes))
						.then(() => trx.run(() => fieldColl.import(fields, { complete: true })))
						.then(() => trx.run(() => fldSchColl.import(fldSchCollData, { type: null, complete: true, details: true })))
						.then(() => trx.run(() => collColl.import(collections, { complete: true })))
						.then(() => trx.run(() => migColl.save(migrationObj)))
						.then(() => migModule.up(this.db))	// execute the migration
						.then(() => trx.commit())
						.catch(ex => migModule.down(this.db).then(() => trx.abort()).then(() => { throw ex; }));
				});
			}
			// some unknown error
			throw new Error(`runMigration(): ${ex.message || ex}`);
		});
	}

	prepareMetadata(normalizedTables, migId, rayId) {
		const tablesMeta = {};
		const fieldsMeta = [];
		const createdAt = new Date();
		const modifiedAt = createdAt;
		const fieldDefaults = { index: false, nullable: false, unique: false, primaryKey: false, createdAt, modifiedAt };

		// first give ids to all tables. IDs are based on hash of the table definition
		for (let [tbl, tblDefn] of Object.entries(normalizedTables)) {
			// we do not track the derived relation tables in the metaDB
			if (MigrationStrings.isRelationTable(tbl)) continue;

			const fieldNames = Object.keys(tblDefn);

			// extract all fields into their categories
			const { baseFields, fkFields, relationFields } = fieldNames.reduce((acc, fld) => {
				const field = tblDefn[fld];
				const fieldPath = field.pathInInput || fld;
				if (field.isArray && field.relationTable)
					acc.relationFields[fieldPath] = field;
				if (field.foreignKey)
					acc.fkFields[fieldPath] = field;
				if (isBaseField(field))
					acc.baseFields.push(fieldPath);
				return acc;
			}, { baseFields: [], fkFields: {}, relationFields: {} });

			// convert all foreignKeys to point to their schepe IDs
			// Object.keys(fkFields).forEach(fld => {
			// 	const fldDefn = tblDefn[fld];
			// 	const referredTable = getTableNameFromForeignKey(fldDefn.foreignKey);
			// 	const referredSchepe = tablesMeta[referredTable];
			// 	if (!referredSchepe || !referredSchepe.id) {
			// 		throw new Error(`${tbl}.${fld} points to "${fldDefn.type}" that cannot be resolved. \n${JSON.stringify(fldDefn, null, "  ")}`);
			// 	}
			// 	fldDefn.type = referredSchepe.id; // points to the whole remote object
			// 	fldDefn.foreignKey = fldDefn.foreignKey.replace(referredTable, ''); // points to the specific path inside the remote object
			// });

			// Create an ID for it based on its definition's hash
			const cborDefn = CBOR.encode(tblDefn);
			tablesMeta[tbl] = {
				[this.keyField]: MigrationStrings._getHash(cborDefn),
				[this.rayField]: rayId,	// multi-tenancy lookup id
				name: tbl,
				createdAt, modifiedAt,
				schema: tblDefn,	// here we are not converting the field type to their IDs, which will allow us to use it as collection name
				validation: "{}",
				baseFields,
				fkFields,
				relationFields,
				migId	// shortId version of the normalized tables (varies for each tenant)
			};
		}

		// create the fields Meta
		for (let [tbl, tblMeta] of Object.entries(tablesMeta)) {
			const tblDefn = normalizedTables[tbl];
			const schepe = tblMeta[this.keyField];
			const fieldNames = Object.keys(tblDefn);
			const fieldCount = fieldNames.length;
			const ids = getSequentialIds(fieldCount);

			for (let i = 0; i < fieldCount; ++i) {
				const name = fieldNames[i];
				const fldDefn = tblDefn[name];
				fieldsMeta.push(Merge({}, fieldDefaults, fldDefn, { name, schepe, [this.keyField]: ids[i], [this.rayField]: rayId }));
			}
		}

		const schepes = Object.values(tablesMeta);
		const fields = fieldsMeta;

		// prepare the base methods for each schepe
		schepes.forEach(schepe => {
			const baseFields = fields.filter(field => field.schepe == schepe._key && isBaseField(field));

			const baseRecord = baseFields.reduce((obj, field) => {
				obj[field.name] = field.pathInInput || field.name;
				return obj;
			}, {});

			schepe.baseInsert = JSON.stringify("??"); //knex(schepe.name).insert(baseRecord).toSQL().toNative());
		});

		return { schepes, fields };
	}	
}

module.exports = MetaBase;