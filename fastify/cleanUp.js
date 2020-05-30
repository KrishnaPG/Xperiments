const { Database } = require('arangojs');

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

// delete all graphs
db.graphs().then(gphs => gphs.forEach(gph => gph.drop()));
// delete all collections
db.collections().then(colls => colls.forEach(coll => coll.drop()));