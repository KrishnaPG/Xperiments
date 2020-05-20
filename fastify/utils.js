const { performance } = require('perf_hooks');

// Generates a sequence of uuid that are monotonically increasing,
// which makes it easy to index and search. Ordered by time and sequence
// number, and uses randomness to avoid duplicates.
// A maximum of ten million entries can be generated in a single call.
function getSequentialIds(nCount = 1, idStrLength = 36) {
	const ids = [];
	const NumBase = 36;
	const Now = Math.ceil((performance.now() + performance.timeOrigin) * 1000);
	const timestamp = Now.toString(NumBase); // 10 chars in base 36
	const fingerprint = (typeof process !== "undefined" ? process.pid : Math.random()) + performance.timeOrigin;
	const Rand = Math.random() * fingerprint;
	for (let i = 0; i < nCount; ++i) {
		const seqNum = i.toString(NumBase).padStart(5, 0); //  10,000,000 in base36 is "5yc1s"
		const randPart = Math.ceil(Rand * performance.now()).toString(NumBase);// roughly 14 base36 chars
		const rand2 = Math.ceil(Math.random() * 2 ** 20).toString(NumBase);	// maximum 4 base36 chars
		ids.push(`${timestamp}-${seqNum}-${randPart}-${rand2}`.padEnd(idStrLength, 0));
	}
	return ids;
}

module.exports = {
	getSequentialIds
}