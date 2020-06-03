const levelup = require('levelup');
const leveldown = require('leveldown');

//const storage = leveldown('./mydb');
const storage = require('sqldown')("./sqlite");

const levelgraph = require("levelgraph");
const db = levelgraph(levelup(storage));

//const triple = { subject: "a", predicate: "b", object: "c" };

const triple = { a: "a", b: "b", c: "c" };

db.put(triple, function (err) {
	db.get({ a: "a" }, function (err, list) {
		console.log(list, list.toString("utf8"));
	});
});
