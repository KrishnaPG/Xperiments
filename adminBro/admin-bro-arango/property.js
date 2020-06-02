const { BaseProperty } = require('admin-bro')

class Property extends BaseProperty {
	static idField = "_id";

	constructor(fld, fldDefn) {
		super({ path: fld, type: fldDefn.type, isId: fld == Property.idField, isSortable: (fldDefn.index || fldDefn.unique) });
		this.fldDefn = fldDefn;
		this.bVisible = fld[0] !== "_";
		console.log(`${fld}: `, this.bVisible);
	}
	
	availableValues() {
		return this.fldDefn.type == "enum" ? this.fldDefn.values : null;
	}

	// isVisible() {
	// 	return this.bVisible;
	// }

	isArray() {
		return this.fldDefn.isArray;
	}

	isEditable() {
		return this.bVisible;
	}

	isRequired() {
		return !this.fldDefn.nullable;
	}
	reference() {
		return this.fldDefn.foreignKey ? `FjZkrENgbEz-${this.fldDefn.type}` : null;
	}
}

module.exports = Property;