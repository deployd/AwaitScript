exports.__asyncApply = function __asyncApply(fn, context, args) {
  var result = null
    , resolved = false;
  var queue = [];
  var memoized = function(fn) {
    if (resolved) {
      fn.apply(null, result);
    } else {
      queue.push(fn);
    }
  };
  var resolve = function() {
    resolved = true;
    result = arguments;
    for (var i = 0; i < queue.length; i++) {
      queue[i].apply(null, arguments);
    }
    queue = null;
  };
  args.push(resolve);
  fn.apply(context, args);
  return memoized;
};