const vm = require("vm");

function loadScript(codeStr, { filename } = {}) {
	const script = new vm.script(codeStr, { filename });
	return script;
}

function runScript(codeStr, context, { filename, timeout = 5000 } = {}) {
	const result = vm.runInNewContext(codeStr, context, { filename, timeout });
	return context;
}

module.exports = {
	loadScript,
	runScript
}