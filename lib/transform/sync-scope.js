var scope = require('./scope');

exports.parse = function(ast, ctx) {
  ast = scope.parse(ast, ctx);
  return ast;
};