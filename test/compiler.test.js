/*jshint evil:true, boss:true */

var compile = require('../').compile;

describe('compiler', function(){
  it('should compile the source', function() {
    var source = sh.cat(SUPPORT + '/sample.ws');
    var result = compile(source);
    
    save(result.ast, 'ast.json');
    save(result.transformed, 'transformed-ast.json');
    save(result.output, 'sample.compiled.js');
  });
});