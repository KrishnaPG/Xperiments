require('./base58');
const CBOR = require('borc');
const Sodium = require('sodium-native');

const {
	normalizeTables, isRelationTable, supportedFieldTypes
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
		return MigrationStrings._bufShortHash.toBase58();
	};

	static isRelationTable = isRelationTable;

	static getId(tables, isNormalized, mtlId) {
		const normalizedTables = isNormalized ? tables : normalizeTables(tables);
		const cborNormTables = CBOR.encode(normalizedTables);
		const id = MigrationStrings._getHash(cborNormTables);
		return {
			id,	// same tables give same id always
			shortId: MigrationStrings._getShortHash(id, mtlId),	// same tables give different shortIds for different mtlIds
			cborNormTables,
			normalizedTables,
			mtlId
		};
	}
	static init(tables, mtlId = "0x") {
		return new MigrationStrings(MigrationStrings.getId(tables, false, mtlId), mtlId);
	}

	constructor({ shortId, normalizedTables, mtlId }) {
		this.normalizedTables = normalizedTables;
		this.migId = shortId;	// migration id calculated based on tables and mtlId; same tables will have different migId for different users (based on mtlId);
		this.mtlId = mtlId | "0x";	// multi-tenancy lookup id
	}
	generate() {
		let strUp = `async (db) => {`;
		let strDown = `async (db) => {`;
		
		const gphName = `mig-${this.migId}-${this.mtlId}`;
		strDown += `
		\n const dropColl = name => { const coll = db.collection(name); return coll.exists().then(exists => exists ? coll.drop() : null); };
		\n const p = [];\n const g = db.graph("${gphName}");
		\n const gExists = await g.exists(); if(gExists) await g.drop(true);`;
		strUp += `
		\n const createColl = name => { const coll = db.collection(name); return coll.exists().then(exists => exists ? coll: coll.create()); }; 
		\n const createEdgeColl = name => { const coll = db.edgeCollection(name); return coll.exists().then(exists => exists ? coll: coll.create()); }; 		
		\n const p = [];\n const g = db.graph("${gphName}");
		\n const gExists = await g.exists(); if(!gExists) await g.create({});`;
		{
			for (let [tbl, tblDefn] of Object.entries(this.normalizedTables)) {
				if (isRelationTable(tbl)) continue;

				strDown += `\n p.push(dropColl("${this.migId}-${tbl}"));`;
				strUp += `\n await createColl("${this.migId}-${tbl}");`;

				for (let [fld, fldDefn] of Object.entries(tblDefn)) {
					if (fldDefn.foreignKey) {
						// insert an edge between tbl and fld.type collections with tbl.fld as the name of relation
						// there could be multiple edges for the same relation. E.g. person -> [addresses]
						const from = tbl;
						const to = fldDefn.type;
						const edgeName = `${this.migId}-${from}-${fld}`;
						const fromName = `${this.migId}-${from}`;
						const toName = `${this.migId}-${to}`;

						strUp += `\n await createEdgeColl("${edgeName}");`;
						//strUp += `\n const ${from}${to}Coll = g.edgeCollection("${edgeName}");`;
						strUp += `\n p.push(g.addEdgeDefinition({collection: "${edgeName}", from: ["${fromName}"], to: ["${toName}"]}));`;
						strDown += `\n p.push(dropColl("${edgeName}"));`;
						continue;
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
		strUp += "\n return Promise.all(p); \n}";
		return { strUp, strDown };
	}
}

module.exports = MigrationStrings;