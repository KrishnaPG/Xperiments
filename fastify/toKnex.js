
class MigrationSource {
	constructor() {
		this.migrations = {};
	}

	// custom methods
	addMigration(name, { up, down }) {
		this.migrations[name] = { up, down };
	}

	// Required methods

	// Must return a Promise containing a list of migrations. 
	// Migrations can be whatever you want, they will be passed as
	// arguments to getMigrationName and getMigration
	getMigrations() {
		return Promise.resolve(Object.keys(this.migrations));
	}
	getMigrationName(migration) {
		console.log("getMigrationName: ", migration);
		return migration;
	}
	getMigration(migration) {
		console.log("getmigration for: ", migration);
		return this.migrations[migration];
	}
};

const migrationSource = new MigrationSource();

// const knex = require('knex')({
// 	client: 'sqlite3',
// 	connection: { filename: __dirname + '/db.sqlite' },
// 	migrations: { migrationSource }
// });

const ObjectPath = require('object-path');
const { tables, builtIns, $extends } = require('./schemas');
const { runScript } = require('./runScript');

const builtInFieldTypes = {
	"boolean": true,
	"dateTime": true,
	"enum": true,
	"float": true,
	"integer": true,
	"string": true,
	"text": true,
	"uuid": true
};

const supportedFieldTypes = builtInFieldTypes;

function isObjectNotEmpty(obj) {
	for (let key in obj)
		if (obj.hasOwnProperty(key))
			return true;
	return false; // object is empty
}

function addNewTable(newTableName, tbl, fld, fldDefn, pendingTables) {
	if (!pendingTables[newTableName])
		pendingTables[newTableName] = $extends(builtIns.idCol);
	pendingTables[newTableName][tbl] = { type: "fk", foreignKey: `${tbl}.id` };
	pendingTables[newTableName][fld] = fldDefn[0];	
}

function addNewRelation(tbl, fld, fldDefn, pendingRelations) {
	if (!pendingRelations[tbl]) pendingRelations[tbl] = {};
	pendingRelations[tbl][fld] = fldDefn;
}

function expandNestedType(tbl, fld, fldDefn, normTables) {
	for (let [childFld, childFldDefn] of Object.entries(fldDefn.properties)) {
		if (!supportedFieldTypes[childFldDefn.type])
			throw new Error(`${tbl}.${fld}.${childFld} unsupported nested type: ${childFldDefn.type}`);
		const nestedFieldName = `${fld}_${childFld}`;
		if (normTables[tbl][nestedFieldName])
			throw new Error(`${tbl}.${fld}.${childFld} nested field with name "${nestedFieldName}" already exists !!`);
		normTables[tbl][nestedFieldName] = childFldDefn;
	}
}

function normalizePendingTables(tables) {
	const normTables = {};
	const pendingTables = {};
	const pendingRelations = {};

	for (let [tbl, tblDefn] of Object.entries(tables)) {
		normTables[tbl] = {};
		const normFields = normTables[tbl];
		for (let [fld, fldDefn] of Object.entries(tblDefn)) {
			let normFldDefn = null;

			// normalize the structure
			if (Array.isArray(fldDefn)) {
				if (!fldDefn.length)
					throw new Error(`${tbl}.${fld} should not be an empty array`);
				if (fldDefn.length === 1) {
					// an array of some type - needs a new table
					addNewTable(`${tbl}_${fld}`, tbl, fld, fldDefn, pendingTables);
					continue;
				} else if (fldDefn.length > 1) {
					// must be enum values
					normFldDefn = { type: "enum", values: fldDefn };
				}
			} else {
				switch (typeof fldDefn) {
					case "function": {
						normFldDefn = fldDefn(); break;
					}
					case "string": {
						if (!builtInFieldTypes[fldDefn]) {
							normFldDefn = { type: "fk", foreignKey: fldDefn };
						}
						else
							normFldDefn = { type: fldDefn };
						break;
					}
					case "object":
					default: {
						normFldDefn = fldDefn; break;
					}
				}
			}

			// postpone processing foreign-key relation till all tables are done
			if (normFldDefn.type === "fk") {
				addNewRelation(tbl, fld, normFldDefn, pendingRelations);
				continue;
			}
			else if (normFldDefn.type === "object") {
				expandNestedType(tbl, fld, normFldDefn, normTables);
				continue;
			}

			// sanity checks for the normFldDefn
			if (!supportedFieldTypes[normFldDefn.type])
				throw new Error(`${tbl}.${fld} has unknown type: ${normFldDefn.type}`);
			// check if field name already exists (happens nested types expand to same name)
			if (normFields[fld])
				throw new Error(`${tbl} encountered duplicate field with same name "${fld}"`);
			
			normFields[fld] = normFldDefn;
		} // for fld
	}

	return {
		normTables,
		pendingTables,
		pendingRelations
	};
}

function normalizePendingRelations(pendingRelations, normTables) {
	for (let [tbl, tblDefn] of Object.entries(pendingRelations)) {
		for (let [fld, fldDefn] of Object.entries(tblDefn)) {
			// add default id if no col is specified for the foreign key table
			if (fldDefn.foreignKey.lastIndexOf('.') == -1)
				fldDefn.foreignKey += ".id"; 
			// get the type definition of the referred foreign key
			const referredTypeDefn = ObjectPath.get(normTables, fldDefn.foreignKey);
			if (!referredTypeDefn || !referredTypeDefn.type)
				throw new Error(`${tbl}.${fld} Invalid foreign key reference: ${fldDefn.foreignKey}`);
			if (referredTypeDefn.foreignKey)
				throw new Error(`${tbl}.${fld} is a foreign key pointing to another foreign key: ${referredTypeDefn.foreignKey}`);
			const fldType = $extends(referredTypeDefn, { foreignKey: fldDefn.foreignKey });
			delete fldType.nullable;
			delete fldType.unique;
			delete fldType.default;
			delete fldType.primaryKey;			
			normTables[tbl][fld] = fldType;
		}
	}
	return normTables;
}

function normalizeTables(tables) {
	let normTables = {};
	let pendingTables = tables;
	let pendingRelations = {};

	while (isObjectNotEmpty(pendingTables)) {
		const result = normalizePendingTables(pendingTables);
		pendingTables = result.pendingTables;
		pendingRelations = $extends(pendingRelations, result.pendingRelations);
		normTables = $extends(normTables, result.normTables);
	}
	return normalizePendingRelations(pendingRelations, normTables);
}


function fieldTypeCreation(fld, fldDefn) {
	switch (fldDefn.type) {
		case "string": {
			return `t.string("${fld}"` + (fldDefn.max ? `, ${fldDefn.max}` : "") + ")";
		}
		case "enum": {
			return `t.enu("${fld}", ${JSON.stringify(fldDefn.values)})`;
		}
		default: return `t.${fldDefn.type}("${fld}")`;
	}
}

function fieldString(fld, fldDefn) {	
	let str = fieldTypeCreation(fld, fldDefn);
	str += (fldDefn.nullable ? ".nullable()" : ".notNullable()");
	if (fldDefn.default) str += `.defaultTo(${fldDefn.default})`;
	if (fldDefn.unique) str += ".unique()";
	if (fldDefn.index) str += ".index()";
	if (fldDefn.primaryKey) str += ".primary()";
	if (fldDefn.comment) str += `.comment(${fldDefn.comment})`;
	return str;
}

function fieldReferences(fld, fldDefn) {
	return fldDefn.foreign ?
		`;\n\tt.foreign("${fld}").references("${fldDefn.references}")` :
		"";	
}

function tableString(tbl, tblDefn) {
	let str = `.createTable("${tbl}", t => { \n`;
	for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		str += "\t" + fieldString(fld, fldDefn) + fieldReferences(fld, fldDefn) + "; \n";
	}
	return str += "})";
}

function generateTables(tables) {
	let strUp = "return knex.schema";
	let strDown = "return knex.schema";
	{
		for (let [tbl, tblDefn] of Object.entries(tables)) {
			strDown += `.dropTableIfExists("${tbl}")`;
			strUp += tableString(tbl, tblDefn);
		}
	}
	strUp += ";";
	strDown += ";";
	return { strUp, strDown };
}

const normalizedTables = normalizeTables(tables);
const { strUp, strDown } = generateTables(normalizedTables);

console.log(strUp);
console.log(strDown);
console.log(normalizedTables);

process.exit(0);

const context = { up: null, down: null };
runScript(`
	up = knex => { ${strUp}	},
	down = knex => {	${strDown} }
`, context);

migrationSource.addMigration("test1", context);

knex.migrate.latest({  }).then(() => {
	const list = knex.migrate.list({  });
	console.log("migration list: ", JSON.stringify(list));
}).catch(ex => console.error(ex, ex.stack));
