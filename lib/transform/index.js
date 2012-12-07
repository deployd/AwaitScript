/* jshint eqnull:true, es5:true */

var _ = require('underscore')
  , util = require('./util')
  , asyncScope = require('./async-scope')
  , compiledFunctions = require('./compiled-functions');

exports.transform = function(ast, options) {
  if (ast.type !== "Program") throw "The root node has to be a program";
  options = options || {};

  options.errors = [];
  var usingCompiledFunctions = {};

  var newAst = {
      type: "Program"
    , body: asyncScope.parse(ast.body, {
        type: "Program"
      , options: options
      , compiledFunctions: usingCompiledFunctions
    })
  };

  usingCompiledFunctions = Object.keys(usingCompiledFunctions);
  for (var i = 0; i < usingCompiledFunctions.length; i++) {
    var k = usingCompiledFunctions[i];
    var func = compiledFunctions[k];
    newAst.body.unshift(util.literal(func.toString()));
  }

  util.traverse(newAst, function(node) {
    if (node.type === "AwaitExpression") util.error(node, "Invalid await expression", options);
    if (node.type === "AsyncExpression") util.error(node, "Invalid async expression", options);
    if (node.type === "AsyncModifier") util.error(node, "Async modifier not supported here", options);
  });

  if (options.errors.length) {
    var error = new Error("Errors occured while compiling AwaitScript");
    error.messages = options.errors;
    error.newAst = newAst;
    throw error;
  }

  return newAst;
};