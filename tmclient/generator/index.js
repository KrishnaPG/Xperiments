/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const cmdlineArgs = require('command-line-args');
const fs = require('fs');
const path = require('path');
const template = require('art-template');
const yaml = require('js-yaml');

const filePath = filename => path.resolve(__dirname, filename);
const cmdlineOptions = [
	{ name: 'output', alias: 'o', type: filePath, multiple: false, defaultOption: true },
	{ name: 'input', alias: 'i', type: filePath, defaultValue: __dirname + '/swagger.yaml' },
	{ name: 'template', alias: 't', type: filePath, defaultValue: __dirname + '/template.art' }
];

// parse commandline arguments
const cli = cmdlineArgs(cmdlineOptions);
if (!cli.input || !fs.existsSync(cli.input)) process.exit(console.error(`specify a valid input path: -i <inputPath>`));
if (!cli.output) process.exit(console.error(`specify a valid output path: -o <outputPath>`));
if (!cli.template || !fs.existsSync(cli.template)) process.exit(console.error(`specify a valid template: -t <templatePath>`));

console.log("Generator started with options:", cli);

const yamlData = yaml.safeLoad(fs.readFileSync(cli.input, 'utf8'));
yamlData.$now = (new Date()).toString();
const generated = template(cli.template, yamlData);
fs.writeFileSync(cli.output, generated);

console.log("Output saved to: ", cli.output);