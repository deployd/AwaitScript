/*jshint evil:true, boss:true */

var esprima = require('./esprima')
  , escodegen = require('./escodegen')
  , transform = require('./transform').transform;

exports.compile = function (source) {
  var ast = esprima.parse(source, {loc: true})
    , transformedAst = transform(ast)
    , output = escodegen.generate(transformedAst);
    
  return {
    output: output,
    transformed: transformedAst,
    ast: ast
  };
}