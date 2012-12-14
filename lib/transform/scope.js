var util = require('./util')
  , syncScope = require('./sync-scope')
  , asyncScope = require('./async-scope');

exports.parse = function(ast, ctx) {
  ast = asyncCallPass(ast, ctx);
  ast = asyncFunctionPass(ast, ctx);
  ast = syncBlockPass(ast, ctx);
  return ast;
};

function asyncCallPass(ast, ctx) {
  return util.traverseImmediateScope(ast, function(n) {
    if (n.type === "DeferExpression") {
      var call = n.argument;
      if (call.type !== "CallExpression") return error(call, "You can only use defer on a function call");
      var context = {type: "ThisExpression"};

      if (call.callee.type == "MemberExpression") {
        context = call.callee.object;
      }

      var args = [call.callee, context, {
          type: "ArrayExpression"
        , elements: call.arguments
      }];

      var newCall = {
          type: "CallExpression"
        , callee: {
            type: "Identifier"
          , name: "__asyncApply"
        }
        , arguments: args
      };

      ctx.compiledFunctions.__asyncApply = true;

      return newCall;
    }
  });
}

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