var util = require('./util')
  , syncScope = require('./sync-scope')
  , asyncScope = require('./async-scope');

exports.parse = function(ast, ctx) {
  ast = asyncFunctionPass(ast, ctx);
  ast = syncBlockPass(ast, ctx);
  return ast;
};

function asyncFunctionPass(ast, ctx) {
  return util.traverseImmediateScope(ast, function(n) {
    var func;
    if (n.type === "AsyncModifier" && 
      (n.body.type === "FunctionDeclaration" || n.body.type === "FunctionExpression")) {
      func = n.body;
      func.params.push({
        type: "Identifier",
        name: 'fn'
      });
      func.body = asyncScope.parse(func.body, util.ctx({
        type: "Function"
      }, ctx));

      return func;
    }
  });
}

function syncBlockPass(ast, ctx) {
  if (ast.type === "BlockStatement") {
    // We want to parse the body, not the block itself
    ast.body = syncBlockPass(ast.body, ctx);
    return ast;
  } else {
    return util.traverse(ast, function(n) {
      if (n.type === "BlockStatement") {
        n.body = syncScope.parse(n.body, util.ctx({
          type: "BlockStatement"
        }, ctx));
        return n;
      }
    });
  }  
}