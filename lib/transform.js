var esprima = require('./esprima');

exports.transform = function(ast) {
  var newAst = {};
  var currentNode = newAst;
  var stack = [];

  if (ast.type !== "Program") throw "The root node has to be a program";

  newAst.type = ast.type;
  newAst.body = [];

  function startAwait(call, resultVar) {
    if (call.type !== "CallExpression") error(call, "You can only await a function call");
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

  function parseBody(body) {
    body.forEach(function(s) {
      if (s.type == "ExpressionStatement" && isAwait(s.expression)) {
        startAwait(s.expression.argument);
      } else if (s.type == "VariableDeclaration") {
        if (s.declarations.length > 1) {
          currentNode.body.push(s);
        } else {
          var declaration = s.declarations[0];
          if (declaration.type !== "VariableDeclarator") error(declaration, "Expected a variable definition");
          if (isAwait(declaration.init)) {
            startAwait(declaration.init.argument, declaration);
          }
        }
      } else {
        currentNode.body.push(s);  
      }
    });
  }

  parseBody(ast.body);  

  return newAst;
};

function isAwait(node) {
  return node.type == "UnaryExpression" && node.operator == "await";
}

function error(node, message) {
  if (node.loc) message = "Line " + node.loc.start.line + ": " + message;
  throw new Error(message);
}

function literalStatement(code) {
  var ast = esprima.parse(code);
  return ast.body[0];
}