const AQL = require('arangojs').aql;
const { BaseResource, BaseRecord } = require('admin-bro');
const Property = require('./property');
const Merge = require('lodash.merge');

class Resource extends BaseResource {
	
	static isAdapterFor(model) {
		return true; //_.get(model, 'base.constructor.name') === 'ArangoDB'
	}
	
	constructor(model) {
		super(model);
		this.dbType = 'ArangoDB';

		// model is a schepe document row in the "meta-schepes" collection
		this.model = model;

		// access the collection for this schepe 
		this.$collName = `${this.model.migId}-${this.model.name}`;
		this.$coll = model.$db.collection(this.$collName);
		
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
		return this.$collName;
	}

	properties() {
		return Object.entries(this.model.schema).map(([fld, fldDefn], index) => this.property(fld));
	}	

	property(path) {
		const fldDefn = Merge({}, this.model.schema[path]);
		if (fldDefn.foreignKey) fldDefn.type = `${this.model.migId}-${fldDefn.type}`; // set the correct reference collection name
		return new Property(path, fldDefn);
	}

	count(filter) {
		const filterExpr = AQL.literal(this.convertFilter(filter));
		return this.model.$db.query(AQL`
			FOR r IN ${this.$coll}
				${filterExpr}
				COLLECT WITH COUNT INTO length
			RETURN length
		`).then(cursor => cursor.next());
	}	

	async populate(baseRecords, property) {
		const ids = baseRecords.map(baseRecord => baseRecord.param(property.name()));
		const records = await this.findMany(ids.flat());

		const recordsHash = records.reduce((memo, record) => {
			memo[record[Property.idField]] = record
			return memo
		}, {});

		baseRecords.forEach((baseRecord) => {
			const id = baseRecord.param(property.name())
			if (recordsHash[id]) {
				const referenceRecord = new BaseRecord(recordsHash[id], this);
				baseRecord.populated[property.name()] = referenceRecord;
			}
		});

		return true;
	}	

	find(filter, { limit = 20, offset = 0, sort = {} }) {
		const filterExpr = AQL.literal(this.convertFilter(filter));
		return this.model.$db.query(AQL`
				FOR r IN ${this.$coll}
				${filterExpr}
				LIMIT ${offset}, ${limit}
				RETURN r
		`).then(cursor => cursor.map(record => new BaseRecord(record, this)));

		/* Ref: https://www.arangodb.com/docs/stable/drivers/js-reference-aql.html
				FOR u IN users
				FILTER u.active == true AND u.gender == "f"
				SORT u.age ASC
				LIMIT 5
				RETURN u
		*/
/*
		const { direction, sortBy } = sort
		const sequelizeObjects = await this.SequelizeModel
			.findAll({
				where: convertFilter(filter),
				limit,
				offset,
				order: [[sortBy, (direction || 'asc').toUpperCase()]],
			})
		return sequelizeObjects.map(sequelizeObject => new BaseRecord(sequelizeObject.toJSON(), this))
		*/
	}

	findOne(id) {
		return this.findById(id).then(record => new BaseRecord(record, this));
	}

	findMany(ids) {
		return this.$coll.lookupByKeys(ids).then(records => records.map(record => new BaseRecord(record, this)));
	}

	findById(id) {
		return this.$coll.firstExample({ [Property.idField]: id });
	}	

	create(params) {
		const parsedParams = this.parseParams(params);
		return this.$coll.save(parsedParams).then(result => {
			this.model.$db.notifyChange({ op: 'Create', result });
			return result;
		});
	}	

	update(id, params) {
		const parsedParams = this.parseParams(params);
		return this.$coll.update({ [Property.idField]: id }, parsedParams).then(result => {
			this.model.$db.notifyChange({ op: 'Update', result });
			return result;
		});
	}

	delete(id) {
		return this.$coll.remove({ [Property.idField]: id }).then(result => {
			this.model.$db.notifyChange({ op: 'Delete', result });
			return result;
		});
	}	

  /**
   * Check all params against values they hold. In case of wrong value it corrects it.
   *
   * What it does exactly:
   * - removes keys with empty strings for the `number`, `float` and 'reference' properties.
   *
   * @param   {Object}  params  received from AdminBro form
   *
   * @return  {Object}          converted params
   */
	parseParams(params) {
		const parsedParams = { ...params }
		this.properties().forEach((property) => {
			const value = parsedParams[property.name()]
			if (['number', 'float', 'reference'].includes(property.type())) {
				if (value === '') {
					delete parsedParams[property.name()]
				}
			}
			if (!property.isEditable()) {
				delete parsedParams[property.name()]
			}
		})
		return parsedParams
	}

	convertFilter(filter) {		
		if (!filter) {
			return "";
		}
		
		const {expr} = filter.reduce((memo, filterProperty) => {
			const { property, value } = filterProperty
			switch (property.type()) {
				case 'string':
					if (property.availableValues()) {
						return {
							expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] === "${escape(value)}"`,
							combiner: "&&"
						}
					}
					return {
						expr: `${memo.expr} ${memo.combiner} CONTAINS(r["${property.name()}"], "${escape(value)}")`,
						combiner: "&&"
					}
				case 'number':
					if (!Number.isNaN(Number(value))) {
						return {
							expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] === ${Number(value)}`,
							combiner: "&&"
						}
					}
					return memo
				case 'date':
				case 'datetime':
					if (value.from || value.to) {
						return {
							expr: `${memo.expr}` +
								(value.from ? ` ${memo.combiner} r["${property.name()}"] >= ${value.from}` : "") +
								(value.to ? ` ${memo.combiner} r["${property.name()}"] <= ${value.to}` : ""),
							combiner: "&&"
						}
					}
					break
				default:
					break
			}
			return {
				expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] = ${value}`,
				combiner: "&&"
			}
		}, { expr: "", combiner: "" });

		return expr.length > 0 ? ("FILTER " + expr) : "";
	}	
	
};

module.exports = Resource;