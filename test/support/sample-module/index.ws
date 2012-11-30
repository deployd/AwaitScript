var fs = require('fs')
  , file = "not loaded"
  , assert = require('assert');

async function run() {
  async function doAsyncThing() {
    var data = await fs.readFile('read-this-file.txt', 'utf-8');
    file = data;
  }

  await doAsyncThing();

  var file2 = await fs.readFile('read-this-file.txt', 'utf-8');

  assert.notEqual(file, 'not loaded');  
}

module.exports = run;