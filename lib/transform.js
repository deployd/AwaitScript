/* jshint eqnull:true */

var esprima = require('./esprima');

exports.transform = function(ast) {
  var newAst = {};
  var currentNode = newAst;
  var stack = [];

  var errors = [];

  if (ast.type !== "Program") throw "The root node has to be a program";

  newAst.type = ast.type;
  newAst.body = [];

  function error(node, message, shouldThrow) {
    if (node.loc) message = "Line " + node.loc.start.line + ": " + message;
    if (shouldThrow) {
      throw new Error(message);
    } else {
      console.error(message);
      errors.push(message);
    }
    
  }

  function startAwait(call, resultVar) {
    if (call.type !== "CallExpression") return error(call, "You can only await a function call");
    currentNode.body.push({
      type: "ExpressionStatement",
      expression: call
    });

    var callback = {
      type: "FunctionExpression",
      params: [{
        "type": "Identifier",
        "name": "err"
      }],
      body: {
        type: "BlockStatement",
        body: [
          literalStatement("if (err) throw err;")
        ]
      }
    };
    call.arguments.push(callback);

    if (resultVar) {
      callback.params.push(resultVar.id);
    }

    stack.push(currentNode);
    currentNode = callback.body;
  }

  function parseAsyncScope(node) {
    node.body.forEach(function(s) {
      if (s.type == "ExpressionStatement" && isAwait(s.expression)) {
        startAwait(s.expression.argument);
      } else if (s.type == "VariableDeclaration") {
        if (s.declarations.length > 1) {
          traverse(s, function(n) {
            if (isAwait(n)) {
              error(n, "Cannot use await in a multi-variable declaration");
              return true;
            }
          });
          currentNode.body.push(s);
        } else {
          var declaration = s.declarations[0];
          if (declaration.type !== "VariableDeclarator") return error(declaration, "Expected a variable definition");
          if (isAwait(declaration.init)) {
            startAwait(declaration.init.argument, declaration);
          }
        }
      } else {
        traverse(s, function(n) {
          if (isAwait(n)) {
            error(n, "Await must be used as a variable definition");
          } else if (n.type === 'BlockStatement') {
            parseSyncScope(n);
            return true;
          }
        });
        currentNode.body.push(s);  
      }
    });
  }

  function parseSyncScope(node) {
    traverse(node, function(n) {
      if (isAwait(n)) {
        error(n, "Await is not allowed in a synchronous scope");
      }
    });
  }

  parseAsyncScope(ast);  

  if (errors.length) {
    throw new Error("Errors occured during compilation");
  }
  return newAst;
};

function isAwait(node) {
  return node.type == "UnaryExpression" && node.operator == "await";
}

function literalStatement(code) {
  var ast = esprima.parse(code);
  return ast.body[0];
}

function traverse(node, fn) {


  if (node && typeof node === 'object') {
    var fnResult = fn(node);
    if (fnResult === true) return true;

    for (var k in node) {
      if (node.hasOwnProperty(k)) {
        if (traverse(node[k], fn)) {
          return true;
        }
      }
    }
  } else if (typeof node === 'array') {
    for (var i = 0; i < node.length; i++) {
      if (traverse(node[i], fn)) {
        return true;
      }
    }
  }
}