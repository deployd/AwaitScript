var fs = require('fs')
  , file = "not loaded";

async function doAsyncThing() {
  var data = await fs.readFile('read-this-file.txt', 'utf-8');
  file = data;
}

await doAsyncThing();

console.log(file);

var file2 = await fs.readFile('read-this-file.txt', 'utf-8');

console.log("file2: " + file2 + " too");