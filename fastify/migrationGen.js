require('./base58');
const CBOR = require('borc');
const Sodium = require('sodium-native');

const {
	normalizeTables, isRelationTable, supportedFieldTypes, isGeoType
} = require('./normalize');



class MigrationStrings {

	static _bufHash = Buffer.alloc(Sodium.crypto_generichash_BYTES);
	static _getHash = (srcStr) => {
		Sodium.crypto_generichash(MigrationStrings._bufHash, Buffer.from(srcStr));
		return MigrationStrings._bufHash.toBase58();
	};
	static _bufShortHash = Buffer.alloc(Sodium.crypto_shorthash_BYTES);
	static _bufShortHashKey = Buffer.alloc(Sodium.crypto_shorthash_KEYBYTES);
	static _getShortHash = (srcStr, key = "default") => {
		MigrationStrings._bufShortHashKey.fill(0);
		MigrationStrings._bufShortHashKey.write(key);
		Sodium.crypto_shorthash(MigrationStrings._bufShortHash, Buffer.from(srcStr), MigrationStrings._bufShortHashKey);
		const shortHash = MigrationStrings._bufShortHash.toBase58();
		return shortHash.match(/^\d/) ? ('z' + shortHash) : shortHash; // prefix z if hash starts with a number (since collection names may have  )
	};

	static isRelationTable = isRelationTable;

	static getId(tables, isNormalized, rayId = "0x") {
		const normalizedTables = isNormalized ? tables : normalizeTables(tables);
		const cborNormTables = CBOR.encode(normalizedTables);
		const id = MigrationStrings._getHash(cborNormTables);
		return {
			id,	// same tables give same id always
			shortId: MigrationStrings._getShortHash(id, rayId),	// same tables give different shortIds for different rayIds
			cborNormTables,
			normalizedTables,
			rayId
		};
	}
	static init(tables, rayId) {
		return new MigrationStrings(MigrationStrings.getId(tables, false, rayId));
	}

	constructor({ shortId, normalizedTables, rayId }) {
		this.normalizedTables = normalizedTables;
		this.migId = shortId;	// migration id calculated based on tables and rayId; same tables will have different migId for different users (based on rayId);
		this.rayId = rayId;	// multi-tenancy lookup id
	}
	generate() {
		let strUp = `async (db) => {`;
		let strDown = `async (db) => {`;
		
		const gphName = `mig-${this.migId}-${this.rayId}`;
		strDown += `
		\n const dropColl = name => { const coll = db.collection(name); return coll.exists().then(exists => exists ? coll.drop() : null); };
		\n const p = [];\n const g = db.graph("${gphName}");
		\n const gExists = await g.exists(); if(gExists) await g.drop(true);`;
		strUp += `
		\n const err = (msg, ex) => { throw new Error(" Context: " + msg + ", " + ex.stack); };
		\n const createColl = async name => { const coll = db.collection(name); const exists = await coll.exists(); if(!exists) await coll.create({ waitForSync: true }).catch(ex => err("createColl('"+ name + "')", ex)); return coll; }; 
		\n const createEdgeColl = async name => { const coll = db.edgeCollection(name); const exists = await coll.exists(); if(!exists) await coll.create({ waitForSync: true }).catch(ex => err("createEdgeColl('"+ name + "')", ex)); return coll; }; 		
		\n const g = db.graph("${gphName}");`;
		// create collections
		{
			strUp += `\n return g.exists().then(exists => exists ? g : g.create({}))`;
			for (let [tbl, tblDefn] of Object.entries(this.normalizedTables)) {
				if (isRelationTable(tbl)) continue;
				strDown += `\n p.push(dropColl("${this.migId}-${tbl}"));`;
				strUp += `\n  .then(() => createColl("${this.migId}-${tbl}")).then(c => Promise.resolve(true)`;
				
				for (let [fld, fldDefn] of Object.entries(tblDefn)) {
					if (fldDefn.index) {
						if (isGeoType(fldDefn.type) || fldDefn.index === "geo")
							strUp += `\n    .then(() => c.ensureIndex({ type: "geo", fields: ["${fld}"], geoJson:true }).catch(ex => err("ensureIndex('${tbl}.${fld}'), geo", ex)))`;
						else if (fldDefn.type.toLowerCase() === "text" || fldDefn.index === "fullText")
							strUp += `\n    .then(() => c.ensureIndex({ type: "fulltext", fields: ["${fld}"], minLength: 3 }).catch(ex => err("ensureIndex('${tbl}.${fld}'), fulltext", ex)))`;
						else
							strUp += `\n    .then(() => c.ensureIndex({ type: "persistent", fields: ["${fld}"] }).catch(ex => err("ensureIndex('${tbl}.${fld}')", ex)))`;
					}
				}
				strUp += ` )`
			}
		}
		// create indices
		// {
		// 	for (let [tbl, tblDefn] of Object.entries(this.normalizedTables)) {
		// 		if (isRelationTable(tbl)) continue;
		// 		for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		// 			if (fldDefn.index) {
		// 				if (isGeoType(fldDefn.type) || fldDefn.index === "geo")
		// 					strUp += `\n  .then(() => c.ensureIndex({ type: "geofdsaf", fields: ["${fld}"], geoJson:true }))`;
		// 				else if (fldDefn.type.toLowerCase() === "text" || fldDefn.index === "fullText")
		// 					strUp += `\n  .then(() => c.ensureIndex({ type: "fulltextfdsfa", fields: ["${fld}"], minLength: 3 }))`;
		// 				else
		// 					strUp += `\n  .then(() => c.ensureIndex({ type: "persistentfdsf", fields: ["${fld}"] }))`;
		// 			}
		// 		}				
		// 	}
		// }
		// edge collections
		{
			for (let [tbl, tblDefn] of Object.entries(this.normalizedTables)) {
				if (isRelationTable(tbl)) continue;

				for (let [fld, fldDefn] of Object.entries(tblDefn)) {
					if (fldDefn.foreignKey) {
						// insert an edge between tbl and fld.type collections with tbl.fld as the name of relation
						// there could be multiple edges for the same relation. E.g. person -> [addresses]
						const from = tbl;
						const to = fldDefn.type;
						const edgeName = `${this.migId}-${from}-${fld}`;
						const fromName = `${this.migId}-${from}`;
						const toName = `${this.migId}-${to}`;

						strUp += `\n  .then(()=> createEdgeColl("${edgeName}"))`;
						//strUp += `\n const ${from}${to}Coll = g.edgeCollection("${edgeName}");`;
						strUp += `\n  .then(() => g.addEdgeDefinition({collection: "${edgeName}", from: ["${fromName}"], to: ["${toName}"]}))`;
						strDown += `\n p.push(dropColl("${edgeName}"));`;
					}
					else if (fldDefn.isArray) {
						// this is just an array type and does not have foreignKey. E.g post -> [keyword strings]
						// first create a collection to hold this fld.type and then add edge relation
						if (!supportedFieldTypes[fldDefn.type])
							throw new Error(`${tbl}.${fld} is array with unknown type "${fldDefn.type}. Forgot to make it as foreignKey?"`);
					}
				}
			}
		}
		strDown += "\n return Promise.all(p); \n}";
		strUp += "; \n}";
		return { strUp, strDown };
	}
}

module.exports = MigrationStrings;