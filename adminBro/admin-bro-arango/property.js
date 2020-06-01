const { BaseProperty } = require('admin-bro')

class Property extends BaseProperty {
	constructor(fld, fldDefn) {
		super({ path: fld, type: fldDefn.type, isId: fld == "id", isSortable: (fldDefn.index || fldDefn.unique) });
		this.fldDefn = fldDefn;
	}
	
	availableValues() {
		return this.fldDefn.type == "enum" ? this.fldDefn.values : null;
	}

	isArray() {
		return this.fldDefn.isArray;
	}
	// isEditable() {
	// 	return !this.reference();
	// }
	isRequired() {
		return !this.fldDefn.nullable;
	}
	reference() {
		return this.fldDefn.foreignKey ? `FjZkrENgbEz-${this.fldDefn.type}` : null;
	}
}

module.exports = Property;