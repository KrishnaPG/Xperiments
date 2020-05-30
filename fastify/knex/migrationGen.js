
const { normalizeTables } = require('../normalize');

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
		if (fldDefn.isArray && fldDefn.relationTable) continue; // skip meta fields
		str += "\t" + fieldString(fld, fldDefn) + fieldReferences(fld, fldDefn) + "; \n";
	}
	return str += "})"; // TODO: can we add a unique constraint to all fields of a relation table?
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
	isRelationTable: (name) => RelationTableNameRegEx.exec(name),

	builtInFieldTypes,
	extendedFieldTypes,
	supportedFieldTypes
}