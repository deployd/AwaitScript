var assert = require('assert');

function bake(fn) {
  setTimeout(function() {
    fn(null, Math.PI);
  }, 10);
}
    
// start a non blocking task
var pi = await bake();

assert.equal(pi, Math.PI);

console.log(pi);
