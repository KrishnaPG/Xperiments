
const ObjectPath = require('object-path');
const { builtIns, $extends } = require('./schemaUtils');

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
const extendedFieldTypes = {
	// "increments": true // may endup being used as foreign key reference type
};
const supportedFieldTypes = Object.assign({}, builtInFieldTypes, extendedFieldTypes);

const ThreeDigitRandomId = () => (100 + Math.floor(Math.random() * 899));
const RelationTableNameRegEx = /^\$rel_(?<relName>[\w\._-]+)_\d{0,3}$/;

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

function expandTypedChild(tbl, fld, fldDefn, pendingFields) {
	for (let [childFld, childFldDefn] of Object.entries(fldDefn.properties)) {
		// if (!supportedFieldTypes[childFldDefn.type])
		// 	throw new Error(`${tbl}.${fld}.${childFld} unsupported nested type: ${childFldDefn.type}`);
		const nestedFieldName = `${fld}_${childFld}`;
		// if (normTables[tbl][nestedFieldName])
		// 	throw new Error(`${tbl}.${fld}.${childFld} nested field with name "${nestedFieldName}" already exists !!`);
		pendingFields[nestedFieldName] = childFldDefn;
	}
}

function expandUnTypedChild(tbl, fld, fldDefn, pendingFields) {
	for (let [childFld, childFldDefn] of Object.entries(fldDefn)) {
		pendingFields[`${fld}_${childFld}`] = childFldDefn;
	}
}

function normalizeTable(tbl, tblDefn, normTables) {
	const pendingFields = {};
	const pendingTables = {};
	const pendingRelations = {};
	const normFields = normTables[tbl];

	for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		let normFldDefn = null;

		// normalize the structure
		if (Array.isArray(fldDefn)) {
			if (!fldDefn.length)
				throw new Error(`${tbl}.${fld} should not be an empty array`);
			if (fldDefn.length === 1) {
				// an array of some type - needs a new table
				addNewTable(`$rel_${tbl}_${fld}_`, tbl, fld, fldDefn, pendingTables);
				continue;
			} else if (fldDefn.length > 1) {
				// must be enum values
				normFldDefn = { type: "enum", values: fldDefn };
			}
		} else {
			switch (typeof fldDefn) {
				case "function": {
					normFldDefn = fldDefn(fld, tbl, tblDefn); break;
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
			expandTypedChild(tbl, fld, normFldDefn, pendingFields);
			continue;
		}
		else if (isObjectNotEmpty(normFldDefn) && !normFldDefn.type) {
			expandUnTypedChild(tbl, fld, normFldDefn, pendingFields);
			continue;
		}

		// sanity checks for the normFldDefn
		if (!supportedFieldTypes[normFldDefn.type])
			throw new Error(`${tbl}.${fld} has unknown type: ${normFldDefn.type}`);
		// check if field name already exists (happens nested types expand to same name)
		if (normFields[fld])
			throw new Error(`${tbl} encountered duplicate field with same name "${fld}"`);

		normFields[fld] = normFldDefn;
	}
	return {
		pendingFields,
		pendingTables,
		pendingRelations
	}
}

function normalizePendingTables(tables) {
	const normTables = {};
	let pendingTables = {};
	let pendingRelations = {};

	for (let [tbl, tblDefn] of Object.entries(tables)) {
		normTables[tbl] = {};
		let pendingFields = tblDefn;
		while (isObjectNotEmpty(pendingFields)) {
			const result = normalizeTable(tbl, pendingFields, normTables);
			pendingTables = $extends(pendingTables, result.pendingTables);
			pendingRelations = $extends(pendingRelations, result.pendingRelations);
			pendingFields = result.pendingFields;
		}
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
			if (!referredTypeDefn || !referredTypeDefn.type || !builtInFieldTypes[referredTypeDefn.type])
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
	return fldDefn.foreignKey ?
		`;\n\tt.foreign("${fld}").references("${fldDefn.foreignKey}")` :
		"";
}

function tableString(tbl, tblDefn) {
	let str = `.createTable("${tbl}", t => { \n`;
	for (let [fld, fldDefn] of Object.entries(tblDefn)) {
		str += "\t" + fieldString(fld, fldDefn) + fieldReferences(fld, fldDefn) + "; \n";
	}
	return str += "})";
}

function generateMigrationStrings(tables, normalized = false) {
	const normalizedTables = normalized ? tables : normalizeTables(tables);
	let strUp = "return knex.schema";
	let strDown = "return knex.schema";
	{
		for (let [tbl, tblDefn] of Object.entries(normalizedTables)) {
			strDown += `.dropTableIfExists("${tbl}")`;
			strUp += tableString(tbl, tblDefn);
		}
	}
	strUp += ";";
	strDown += ";";
	return { strUp, strDown, normalizedTables };
}

module.exports = {
	normalizeTables,
	generateMigrationStrings,
	isRelationTable: (name) => RelationTableNameRegEx.exec(name)
}