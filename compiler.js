/*jshint evil:true, boss:true */

var sh = require('shelljs')
  , uglify = require('uglify-js2')
  , burrito = require('burrito')
  , esprima = require('./lib/esprima')
  , escodegen = require('./lib/escodegen')
  , transform = require('./lib/transform').transform;

console.log();
console.log('-----------');
console.log();

var source = sh.cat('sample.ws');

var ast = esprima.parse(source);

if (!sh.test('-d', 'debug')) sh.mkdir('debug');

JSON.stringify(ast, null, '  ').to('debug/sample-ast.json');

var transformedAst = transform(ast);
JSON.stringify(transformedAst, null, '  ').to('debug/sample-transformed-ast.json');

var output = escodegen.generate(transformedAst);

output.to('sample.js');

eval(output);