const { BaseProperty } = require('admin-bro')

class Property extends BaseProperty {
	static idField = "_key";

	constructor(fld, fldDefn) {
		super({
			path: fld,
			isId: fld === Property.idField,
			type: fldDefn.foreignKey ? 'reference' : fldDefn.type,
			isSortable: (fldDefn.index || fldDefn.unique)
		});
		this.bEditable = fld[0] !== "_"; // does not start with _
		this.fldDefn = fldDefn;
	}
	
	availableValues() {
		return this.fldDefn.type == "enum" ? this.fldDefn.values : null;
	}

	// isVisible() {
	// 	return {};//this.bVisible;
	// }

	isArray() {
		return this.fldDefn.isArray;
	}

	isEditable() {
		return this.bEditable;
	}

	isRequired() {
		return !this.fldDefn.nullable;
	}
	reference() {
		return this.fldDefn.foreignKey ? this.fldDefn.type : null;
	}
}

module.exports = Property;