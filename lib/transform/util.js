var _ = require('underscore')
  , esprima = require('../esprima');

exports.traverse = function(node, fn, parent) {
  var trvResult;
  if (node && typeof node === 'object' && node.type) {
    var fnResult = fn(node, parent);
    // return 'break' if you've found what you're looking for
    // return 'stop' if you don't want to traverse this node any further
    // return a node object if you want to replace the node inline
    if (fnResult) return fnResult;

    for (var k in node) {
      if (node.hasOwnProperty(k)) {
        trvResult = exports.traverse(node[k], fn, node);
        if (trvResult === 'break') {
          return 'break';
        } else if (trvResult === 'delete') {
          node[k] = null;
        } else if (trvResult && typeof trvResult === 'object' && trvResult.type) {
          node[k] = trvResult;
        }
      }
    }
  } else if (Object.prototype.toString.call(node) === '[object Array]') {
    var deletedItems = [];
    for (var i = 0; i < node.length; i++) {
      trvResult = exports.traverse(node[i], fn, node);
      if (trvResult === 'break') {
        return 'break';
      } else if (trvResult === 'delete') {
        deletedItems.push(node[i]);
      } else if (trvResult && typeof trvResult === 'object' && trvResult.type) {
        node[i] = trvResult;
      }
    }
    if (deletedItems.length) {
      node = _.difference(node, deletedItems);
    }
  }

  return node;
};

exports.traverseImmediateScope = function(node, fn) {
  if (node.type === "BlockStatement") {
    node.body = exports.traverseImmediateScope(node.body, fn);
    return node;
  } else {
    return exports.traverse(node, function(node) {
      if (node.type === "BlockStatement") return 'stop';
      return fn(node);
    });  
  }
};

exports.traverseScope = function(node, fn) {
  return exports.traverse(node, function(node) {
    if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") return 'stop';
    return fn(node);
  });  
};


exports.ctx = function(options, base) {
  return _.defaults(options, base);
};  

exports.error = function(node, message, options) {
  if (node.loc) message = "Line " + node.loc.start.line + ": " + message;
  var error = message;
  if (options && options.errors) options.errors.push(error);
  return error;
};

exports.literal = function(code) {
  var ast = esprima.parse(code, {tolerant: true});
  return ast.body[0];
};