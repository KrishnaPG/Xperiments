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

if (process.argv.length <= 2) throw new Error(`Did you specify the <sourceDir> ?`);

const sourceDir = path.resolve("./", process.argv[2]);

function loadFileIntoDB(filePath, name, coll, trx) {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, { encoding: "utf8" }, (err, data) => {
			if (err || !data || data.length <= 0) {
				console.log(chalk.yellow('-'), `${name}: `, err ? err.code : " no content");
				return resolve();
			}
			let records = null;
			try { records = JSON.parse(data); } catch (ex) { return reject(`[${name}] Failed to load: ${filePath} \n ${ex}`); };
			resolve(trx.run(() => coll.import(records, { complete: true, onDuplicate: "replace" }))); // complete=true aborts on any error
		});
	});
}

const schColl = db.collection("meta-schepes");
schColl.exists().then(exists => {
	if (!exists) throw ("[meta-schepes] does not exist. Probably database is empty !!");
	console.log(chalk.green('[✓]'), "Loading started from ", sourceDir);
}).then(() => new Promise((resolve, reject) => {
	// check if source folder exists
	fs.access(sourceDir, err => {
		if (err) reject(`${sourceDir} does not exist or not accessible`);
		else resolve(sourceDir);
	});
})).then(() => {
	return schColl.all().then(cursor => cursor.all()).then(schepeMetadocs => {
		// for each schepe
		const colls = schepeMetadocs.reduce((obj, schepe) => {
			obj[schepe.name] = db.collection(schepe.migId + "-" + schepe.name);
			return obj;
		}, {});

		return db.beginTransaction({ read: [], write: Object.values(colls) }).then(trx =>
		{
			let p = Promise.resolve(true);
			for (let [name, coll] of Object.entries(colls)) {
				const filePath = path.join(sourceDir, name + ".json");
				p = p.then(() => loadFileIntoDB(filePath, name, coll, trx));
			}
			return p.then(() => trx.commit()).catch(ex => { console.log(chalk.red("✘"), ex); return trx.abort(); });
		});
	}).then(console.log);
}).catch(console.error);