var scope = require('./scope')
  , util = require('./util')
  , _ = require('underscore');

exports.parse = function(ast, ctx) {
  ast = anonAwaitPass(ast, ctx);
  ast = scope.parse(ast, ctx);
  ast = hoistPass(ast, ctx);
  if (ctx.type === "Function") ast = returnAndThrowPass(ast, ctx);  
  ast = reflowPass(ast, ctx);
  return ast;
};

function anonAwaitPass(ast, ctx) {
  if (!_.isArray(ast)) {
    ast.body = anonAwaitPass(ast.body, ctx);
    return ast;
  }

  var newAst = [];
  var awaitCount = 0;
  ast.forEach(function(statement) {
    var awaits = [];
    if (statement.type === "ExpressionStatement" && statement.expression.type === "AwaitExpression") {
      newAst.push(statement);
      return;
    }
    util.traverseImmediateScope(statement, function(n, parent) {
      if (n.type === "AwaitExpression" && parent.type !== "VariableDeclarator") {
        var anonAwait;
        try {
          anonAwait = {
            id: '__' + util.letterCounter(awaitCount),
            argument: n.argument
          };

        } catch (ex) {
          util.error(anonAwait, "You cannot have more than 26 anonymous awaits in a single function", ctx.options);
        }
        if (anonAwait) {
          awaits.push(anonAwait);
          awaitCount++;  
          return {
            "type": "Identifier",
            "name": anonAwait.id
          };
        }
        
      }
    });

    if (!awaits.length) {
      newAst.push(statement);
    } else {
      awaits.forEach(function(await) {
        newAst.push({
          type: "VariableDeclaration",
          kind: "var",
          declarations: [{
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: await.id
            },
            init: {
              type: "AwaitExpression",
              argument: await.argument
            }
          }]
        });
      });
      newAst.push(statement);
    }
  });
  return newAst;
}

function hoistPass(ast, ctx) {
  var variables = {};
  var functions = {};

  function makeAssignment(assignment) {
    return {
        type: "AssignmentExpression"
      , operator: "="
      , left: assignment.id
      , right: assignment.init
    };
  }

  ast = util.traverse(ast, function(n, parent) {
    if (n.type === "FunctionExpression") return 'stop';
    if (n.type === "FunctionDeclaration") {
      functions[n.id.name] = n;
      return 'delete';
    }
    if (n.type === "VariableDeclaration") {

      var isAwait = false;
      util.traverse(n, function(n) {
        if (n.type === "AwaitExpression") {
          isAwait = true;
          return false;
        }
      });

      if (isAwait) return 'stop';

      var assignments = [];
      n.declarations.forEach(function(d) {
        if (d.init) {
          // require() is ok to hoist
          if (d.init.type === "CallExpression" && d.init.callee.type === "Identifier" && d.init.callee.name === "require" && d.init.arguments.length === 1 && d.init.arguments[0].type === "Literal") {
            variables[d.id.name] = d;
          } else {
            assignments.push(d);
            variables[d.id.name] = {
              type: "VariableDeclarator",
              id: {
                  type: "Identifier"
                , name: d.id.name
              }
            }
          }
        } else {
          variables[d.id.name] = d;
        }
      });
      var replacement = {};
      if (assignments.length == 1) {
        replacement = makeAssignment(assignments[0]);
      } else if (assignments.length > 1) {
        replacement = {
            type: "SequenceExpression"
          , expressions: assignments.map(makeAssignment)
        };
      } else {
        return 'delete';
      }

      if (!parent || parent.type === "BlockStatement") {
        return {
          type: "ExpressionStatement",
          expression: replacement
        };
      } else {
        return replacement;
      }
    }
  });

  var scope = ast;
  if (!_.isArray(scope)) {
    scope = ast.body;
    if (!_.isArray(scope)) util.error(ast, "Unexpected " + scope.type, ctx.options);
  }

  Object.keys(functions).reverse().forEach(function(k) {
    scope.unshift(functions[k]);
  });

  if (Object.keys(variables).length) {
    var hoistedDeclaration = {
        type: "VariableDeclaration"
      , kind: "var"
      , declarations: Object.keys(variables).map(function(k) {
          return variables[k];
        })
    };

    scope.unshift(hoistedDeclaration);
  }  

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
    if (call.type !== "CallExpression") {
      call = {
        type: "CallExpression",
        callee: call,
        arguments: []
      };
    } 

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
          if (declaration.init && declaration.init.type == "AwaitExpression") {
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