var addon = require('bindings')('addon.node')

console.log('This should be eight:', addon.add(3, 5));

const matchTypes = {
	/// Exact match.
	exact: 0,
	/// Approximate string matching with dice coefficient.
	dice: 1,
	/// Approximate string matching with cosine coefficient.
	cosine: 2,
	/// Approximate string matching with jaccard coefficient.
	jaccard: 3,
	/// Approximate string matching with overlap coefficient.
	overlap: 4,	
}


function CallMe() {
	const w = new addon.Writer("./sample.db");
	console.log("writer result: ", w.insert("James Gordon Brown"));
	w.close();

	const r = new addon.Reader();
	console.log("open result: ", r.open("./sample.db"));

	const searchTerms = ["ding", "Gordon Brown", "Brown"];
	searchTerms.forEach(term => {
		console.log(`retrieve ${term}`);
		Object.keys(matchTypes).forEach(key => {
			for (let threshold = 0.1; threshold < 1.09; threshold += 0.10)
				console.log(`   ${threshold.toFixed(2)} ${key}: `, r.retrieve(term, matchTypes[key], threshold));
		});
	});	
	r.close();
}
CallMe();