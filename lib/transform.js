/* jshint eqnull:true, es5:true */

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

  function startAwait(call, resultVar, scope) {
    if (call.type !== "CallExpression") return error(call, "You can only await a function call");
    currentNode.body.push({
      type: "ExpressionStatement",
      expression: call
    });

    var errorStatement;
    if (scope && scope.type === "FunctionDeclaration") {
      errorStatement = literalStatement("function foo(err, fn) { if (err) return fn && fn(err); }").body.body[0];
    } else {
      errorStatement = literalStatement("if (err) throw err;");
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
    call['arguments'].push(callback);

    if (resultVar) {
      callback.params.push(resultVar.id);
    }

    // stack.push(currentNode);
    currentNode = callback.body;
  }

  function parseAsyncScope(node, scope) {
    var lastNode = currentNode;
    var rootNode = {body: []};
    currentNode = rootNode;
    node.body.forEach(function(s) {
      if (s.type === "AsyncModifier") {
        if (s.body.type == "FunctionDeclaration") {
          createAsyncFunction(s.body);
        } else {
          error(s, "Unexpected " + s.type + " after async");
        }
      } else if (s.type == "ExpressionStatement" && isAwait(s.expression)) {
        startAwait(s.expression.argument, null, scope);
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
            startAwait(declaration.init.argument, declaration, scope);
          }
        }
      } else {
        traverse(s, function(n) {
          if (isAwait(n)) {
            error(n, "Unexpected " + n.argument.type + " after await");
          } else if (n.type === 'BlockStatement') {
            parseSyncScope(n);
            return true;
          }
        });
        currentNode.body.push(s);
      }
    });
    if (scope && scope.type === "FunctionDeclaration") currentNode.body.push(literalStatement("fn();"));
    currentNode = lastNode;
    return rootNode.body;
  }

  function createAsyncFunction(node) {
    node.params.push({
      type: "Identifier",
      name: 'fn'
    });

    node.body = {
      type: "BlockStatement",
      body: parseAsyncScope(node.body, node)
    };

    currentNode.body.push(node);
  }

  function parseSyncScope(node) {
    traverse(node, function(n) {
      if (isAwait(n)) {
        error(n, "Await is not allowed in a synchronous scope");
      }
    });
  }

  var newAstBody = parseAsyncScope(ast);

  if (errors.length) {
    throw new Error("Errors occured during compilation");
  }
  newAst.body = newAstBody;
  return newAst;
};

function isAwait(node) {
  return node.type == "AwaitExpression";
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