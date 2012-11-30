var compile = require('../').compile;

describe('compiler', function(){
  it('should compile the source', function() {
    var source = sh.cat(EXAMPLES + '/sample.ws');
    var result = compile(source);
    
    assert.equal(typeof result, 'string');
  });
});