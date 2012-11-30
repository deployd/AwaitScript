var fs = require('fs')
  , file = "not loaded";

async function doAsyncThing() {
  var data = await fs.readFile('read-this-file.txt', 'utf-8');
  file = data;
}

async function getUppercaseFile() {
  var data = await fs.readFile('read-this-file.txt', 'utf-8');
  return data.toUpperCase();
}

await doAsyncThing();

console.log(file);

var file2 = await fs.readFile('read-this-file.txt', 'utf-8');

console.log("file2: " + file2 + " too");

var file3 = await getUppercaseFile();
console.log("file3: " + file3);