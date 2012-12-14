var fs = require('fs');
var longFile = "";

for (var i = 0; i < 1000; i++) {
  longFile += "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce varius varius commodo. Sed iaculis imperdiet ornare. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. In sit amet turpis et dui egestas gravida non vitae sapien. Nulla facilisi. Suspendisse potenti. Duis libero metus, vehicula eget pretium eu, facilisis eu purus. Donec massa ante, scelerisque a suscipit at, lacinia sed ligula. Ut et felis sit amet felis pretium sodales ac non erat. Vivamus eu nunc sit amet urna vulputate suscipit. Nunc sed massa dui, a luctus elit. Sed hendrerit gravida magna, ut sagittis ipsum aliquet vel. Sed felis neque, malesuada vitae tempor id, placerat non tellus. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Etiam sed arcu vitae eros eleifend semper. Quisque egestas euismod magna, ut venenatis nisl vestibulum quis.";
}

async function longOperation(fileName) {
  await fs.writeFile(fileName, longFile, 'utf-8');
  var result = await fs.readFile(fileName, 'utf-8');
  await fs.unlink(fileName);
  if (result === longFile) {
    return "Done!";
  } else {
    throw "File does not match";
  }
}

function longOperationSync(fileName) {
  fs.writeFileSync(fileName, longFile, 'utf-8');
  var result = fs.readFileSync(fileName, 'utf-8');
  fs.unlinkSync(fileName);
  if (result === longFile) {
    return "Done!";
  } else {
    throw "File does not match";
  }
}

async function testPerformance(name, benchmark) {
  console.log();
  console.log("Testing " + name + "...");
  var start = Date.now();
  await benchmark;
  var end = Date.now();
  var time = end - start;
  console.log(name + " took " + time + "ms");
}

await testPerformance("synchronous", async function() {
  console.log("Operation 1: " + longOperationSync('test-file-1.txt'));
  console.log("Operation 2: " + longOperationSync('test-file-2.txt'));
  console.log("Operation 3: " + longOperationSync('test-file-3.txt'));
});

await testPerformance("await", async function() {
  console.log("Operation 1: " + await longOperation('test-file-1.txt'));
  console.log("Operation 2: " + await longOperation('test-file-2.txt'));
  console.log("Operation 3: " + await longOperation('test-file-3.txt'));
});

await testPerformance("defer", async function() {
  var operation1 = defer longOperation('test-file-1.txt');
  var operation2 = defer longOperation('test-file-2.txt');
  var operation3 = defer longOperation('test-file-3.txt');
  console.log("Operation 1: " + await operation1);
  console.log("Operation 2: " + await operation2);
  console.log("Operation 3: " + await operation3);
});
