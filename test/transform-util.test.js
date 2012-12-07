var util = require('../lib/transform/util')
  , esprima = require('../lib/esprima');

describe('transform util', function() {
  describe('traverseImmediateScope', function() {
    it('should only traverse the immediate scope', function() {
      /*jshint multistr:true*/
      var ast = esprima.parse(" \
        var x = 'foo'; \
        if (x === 'foo') { \
          doSomething(); \
        } else { \
          doSomethingElse(); \
        } \
        finallyDoSomething(); \
      ");

      var count = 0;
      util.traverseImmediateScope(ast.body, function(n) {
        if (n.type === "CallExpression") count++;
      });

      assert.equal(count, 1);
    });
  });
});