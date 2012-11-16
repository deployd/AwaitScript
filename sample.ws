var fs = require('fs')
  , file = "not loaded";

function doAsyncThing(fn) {
  fs.readFile('read-this-file.txt', 'utf-8', function(err, res) {
    if (err) return fn(err);
    file = res;
    fn();
  });
}

await doAsyncThing();

console.log(file);

var file2 = await fs.readFile('read-this-file.txt', 'utf-8');

console.log("file2: " + file2 + " REALLY WELL");