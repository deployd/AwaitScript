/*jshint evil:true, boss:true */

var esprima = require('./esprima')
  , escodegen = require('./escodegen')
  , transform = require('./transform').transform;

exports.compile = function (source, options) {
  var ast = esprima.parse(source, {loc: true})
    , transformedAst = transform(ast, options)
    , output = escodegen.generate(transformedAst);
    
  return output;
}