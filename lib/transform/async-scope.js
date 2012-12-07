var scope = require('./scope')
  , util = require('./util')
  , _ = require('underscore');

exports.parse = function(ast, ctx) {
  ast = scope.parse(ast, ctx);
  ast = hoistPass(ast, ctx);
  if (ctx.type === "Function") ast = returnAndThrowPass(ast, ctx);  
  ast = reflowPass(ast, ctx);
  return ast;
};

function hoistPass(ast, ctx) {
  return ast;
}

function returnAndThrowPass(ast, ctx) {
  var fn = {
      type: "Identifier"
    , name: "fn"
  };
  var _null = {
      type: "Literal"
    , value: null
    , raw: "null"
  };
  var createReturnStatement = function(args) {
    return {
        type: "ReturnStatement"
      , argument: {
          type: "LogicalExpression"
        , operator: "&&"
        , left: fn
        , right: {
            type: "CallExpression"
          , callee: fn
          , arguments: args
        }
      } 
    };
  };
  return util.traverseScope(ast, function(n) {
    var args;

    if (n.type === "ReturnStatement") {
      args = [_null];
      if (n.argument) args.push(n.argument);
      return createReturnStatement(args);
    } else if (n.type === "ThrowStatement") {
      return createReturnStatement([n.argument]);
    }
  });
}

function reflowPass(ast, ctx) {
  var newBody = []
    , currentBody = newBody;

  function startAwait(call, resultVar) {
    if (call.type !== "CallExpression") return error(call, "You can only await a function call");

    var errorStatement;
    if (ctx.type === "Function") {
      errorStatement = util.literal("if (err) return fn && fn(err);");
    } else {
      errorStatement = util.literal("if (err) throw err;");
    }

    var callback = {
      type: "FunctionExpression",
      params: [{
        "type": "Identifier",
        "name": "err"
      }],
      body: {
        type: "BlockStatement",
        body: [
          errorStatement
        ]
      }
    };
    if (resultVar) {
      callback.params.push(resultVar.id);
    }
    call['arguments'].push(callback);

    currentBody.push({
      type: "ExpressionStatement",
      expression: call
    });

    currentBody = callback.body.body;
  }

  if (_.isArray(ast)) {
    
    ast.some(function(node) {
      if (node.type == "ExpressionStatement" && node.expression.type == "AwaitExpression") {
        startAwait(node.expression.argument);
        return;
      } else if (node.type == "VariableDeclaration") {
        if (node.declarations.length > 1) {
          util.traverse(node, function(n) {
            if (n.type == "AwaitExpression") {
              error(n, "Cannot use await in a multi-variable declaration");
              return true;
            }
          });
          currentBody.push(node);
        } else {
          var declaration = node.declarations[0];
          if (declaration.type !== "VariableDeclarator") return error(declaration, "Expected a variable definition");
          if (declaration.init.type == "AwaitExpression") {
            startAwait(declaration.init.argument, declaration, scope);
          } else {
            currentBody.push(node);
          }
        }
      } else {
        currentBody.push(node);
      }
    });

    if (ctx.type == "Function") {
      var last = _.last(currentBody);
      if (!(last && last.type == "ReturnStatement")) {
        currentBody.push(util.literal('return fn && fn()'));    
      }
    }    

    return newBody;

  } else if (ast.type === "BlockStatement") {
    ast.body = reflowPass(ast.body, ctx);
    return ast;
  } else {
    return {
      type: "BlockStatement",
      body: reflowPass([ast], ctx)
    };
  }
  
}