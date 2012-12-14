var fs = require('fs')
  , file = "not loaded";

var doAsyncThing = async function() {
  var data = await fs.readFile('read-this-file.txt', 'utf-8');
  file = data;
  if (!file) {
    throw new Error("No data loaded");
  }
}

async function getUppercaseFile() {
  var data = await fs.readFile('read-this-file.txt', 'utf-8');
  return data.toUpperCase();
}

var file1 = defer doAsyncThing();
var file2 = defer fs.readFile('read-this-file.txt', 'utf-8');
var file3 = defer getUppercaseFile();

await file1;
console.log(file);
console.log("file2: " + await file2 + " too");
console.log("file3: " + await file3);