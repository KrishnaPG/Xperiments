const { BaseResource, BaseRecord } = require('admin-bro');
const Property = require('./property');

class Resource extends BaseResource {
	
	static isAdapterFor(model) {
		return true; //_.get(model, 'base.constructor.name') === 'ArangoDB'
	}
	
	constructor(model) {
		super(model);
		this.dbType = 'ArangoDB';
		this.model = model;
		// add id field for every schema, if it does not exist
		if (!this.model.schema[Property.idField])
			this.model.schema[Property.idField] = { type: "string", unique: true, nullable: false, max: 48, primaryKey: true };
	}

	databaseName() {
		return "default"; //this.MongooseModel.db.name
	}

	databaseType() {
		return this.dbType
	}

	name() {
		return this.model.name;	// table name
	}

	id() {
		return `${this.model.migId}-${this.model.name}`;
	}

	properties() {
		return Object.entries(this.model.schema).map(([fld, fldDefn], index) => new Property(fld, fldDefn));
	}	

	property(path) {
		const schema = this.model.schema;
		return new Property(path, schema[path]);
	}

	async count(filter) {
		return 0;
		return this.SequelizeModel.count(({
			where: convertFilter(filter),
		}))
	}	

	async find(filter, { limit = 20, offset = 0, sort = {} }) {

		return [];
		const { direction, sortBy } = sort
		const sequelizeObjects = await this.SequelizeModel
			.findAll({
				where: convertFilter(filter),
				limit,
				offset,
				order: [[sortBy, (direction || 'asc').toUpperCase()]],
			})
		return sequelizeObjects.map(sequelizeObject => new BaseRecord(sequelizeObject.toJSON(), this))
	}

	// async create(params) {
	// 	const parsedParams = this.parseParams(params)
	// 	try {
	// 		const record = await this.SequelizeModel.create(parsedParams)
	// 		return record.toJSON()
	// 	} catch (error) {
	// 		if (error.name === SEQUELIZE_VALIDATION_ERROR) {
	// 			throw createValidationError(error)
	// 		}
	// 		throw error
	// 	}
	// }	

	
};

module.exports = Resource;