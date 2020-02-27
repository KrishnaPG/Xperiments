
function _deepCloneArray(arr) {
	const dest = [];
	for (let i = 0; i < arr.length; ++i)
		dest[i] = deepClone(arr[i]);
	return dest;
}

function _deepCloneObject(obj) {
	const dest = {};
	Object.keys(obj).forEach(key => {
		dest[key] = deepClone(obj[key]);
	});
	return dest;
}

/**
 * @returns a deep cloned copy of the given input. Input can be of any type.
 * Arrays, Dates, Regular expressions, NaN, null, undefined are supported.
 * Limitations: Does not support functions, or circular references
 * @example
 * 	const input = { key1: "val1", key2: { key21: "val21", key22: "val22" } };
 *  const clonedOutput = deepClone(input);
 */
function deepClone(input) {
	if(typeof input !== 'object' || input == null) 
		return input;
	if (input instanceof Date) return new Date(input);
	if (input instanceof RegExp) return new RegExp(input);
	/* add more instance type checks here if required */
	if (Array.isArray(input)) return _deepCloneArray(input);
	return _deepCloneObject(input);
}

module.exports = deepClone;