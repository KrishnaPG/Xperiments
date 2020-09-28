const nearley = require("nearley");

const compiledGrammar = require("./grammar.js");

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(compiledGrammar));
