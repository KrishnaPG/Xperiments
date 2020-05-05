const vm = require("vm");

// Converts the given string as an executable script.
// Does not run the script. To run it, the script has
// to be invoked with a context of data items.
function loadScript(codeStr, { filename } = {}) {
	const script = new vm.script(codeStr, { filename });
	return script;
}

// Executes the given string, with the given data items as context
function runScript(codeStr, context, { filename, timeout = 5000 } = {}) {
	const result = vm.runInNewContext(codeStr, context, { filename, timeout });
	return context;
}

module.exports = {
	loadScript,
	runScript
}