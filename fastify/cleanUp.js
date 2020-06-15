const { Database } = require('arangojs');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

const dbConfig = {
	url: "http://localhost:8529",
		dbName: "default",
			auth: {
		username: "test",
			password: "password"
	}
};

const db = new Database(dbConfig);

db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

// save the data
const targetDir = path.join(__dirname, `.db/${(new Date()).toISOString().replace(/:/g, "_")}`);
const schColl = db.collection("meta-schepes");
schColl.exists().then(exists => {
	if (!exists) throw ("[meta-schepes] does not exist. Probably database is empty !!");
}).then(() => fs.promises.mkdir(targetDir, { recursive: true }))
	.then(() => {
		return schColl.all().then(cursor => cursor.all()).then(schepeMetadocs => {
			// for each schepe
			const p = schepeMetadocs.map(schepe => {
				const coll = db.collection(schepe.migId + "-" + schepe.name);
				return coll.all().then(cursor => cursor.all()).then(docs => new Promise((resolve, reject) => {
					// save all records of this table to a file
					const filePath = path.join(targetDir, schepe.name + ".json");
					fs.writeFile(filePath, JSON.stringify(docs, null, " "), err => {
						if (err)
							reject(`Error writing to ${filePath}: ${JSON.stringify(err, null, " ")}`);
						else
							resolve(filePath);
					})
				}));
			});
			return Promise.all(p);
		});
	}).then(values => {
		console.log(chalk.green('[✓]'), "Data saved to: ", values);
		// delete all graphs
		return db.graphs().then(gphs => gphs.forEach(gph => gph.drop()));
	}).then(() => {
		console.log(chalk.green('[✓]'), "Deleted all graphs");
		// delete all collections
		return db.collections().then(colls => colls.forEach(coll => coll.drop()));
	}).then(() => {
		console.log(chalk.green('[✓]'), "Deleted all collections");
	}).catch(console.error);
