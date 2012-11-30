var compile = require('../').compile;

describe('compiler', function(){
  it('should compile the source', function() {
    var source = sh.cat(EXAMPLES + '/sample.ws');
    var result = compile(source);
    
    save(result.ast, 'sample.ast.json');
    save(result.transformed, 'sample.transformed-ast.json');
    save(result.output, 'sample.compiled.js');
  });
});