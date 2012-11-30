describe('modules', function(){
  it('should just work', function(done) {
    var mod = require(SUPPORT + '/sample-module');
    
    mod(done);
  });
});