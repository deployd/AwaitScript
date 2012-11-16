# AwaitScript

A proof-of-concept JavaScript compiler designed to let you write asynchronous code as if it were synchronous.

The compiler is extremely early, but you can run `node compiler.js` to compile and run the included `sample.ws` file; you can look at `sample.js` to see what it outputs.

## Philosophy

AwaitScript is designed for Node.js; specifically the `fn(error, result)` callback pattern. All JavaScript should compile 1:1 unless you use the `await` or `async` keywords. 

Libraries that follow Node's conventions should "just work", and functions you create in AwaitScript should be callable from Node without any hint that they were written in anything but Node and JavaScript.

## Basic Syntax

You use the `await` keyword to wait for the result of an asynchronous function. Example:

    console.log("Deleting...");
    await fs.rmdir('mydir');
    console.log("Deleted.");

Compiles to:

    console.log("Deleting...");
    fs.rmdir('mydir', function(err) {
      if (err) throw err;
      console.log("Deleted.");
    });

You can also assign the result of `await` to a new variable:

    var file = await fs.readFile('myfile.txt', 'utf-8');
    console.log(file);

Compiles to:

    fs.readFile('myfile.txt', 'utf-8', function(err, file) {
      if (err) throw err;
      console.log(file);
    });

## Planned features

AwaitScript is *extremely* immature. This is only a proof-of-concept that I plan to develop.

### Asynchronous functions

Syntax:

    async function doSomethingAsync() {
      var file = await fs.readFile('myfile.txt', 'utf-8');
      return file;
    }

Will compile to a function with the signature `doSomethingAsync(fn)`, with a callback `fn(err, file)`. This can be called from regular Node JavaScript, or, more usefully, awaited:

    var file = await doSomethingAsync();

### Flow control

Syntax:

    var file;
    async if (foo > bar) {
      file = await fs.readFile('myfile.txt', 'utf-8');
    } else {
      file = await fs.readFile('myotherfile.txt', 'utf-8');
    }

    console.log("Loaded file", file);

I'll start with `if` statements, and slowly try to support more, like `try/catch`, `for` and `while`. Keep in mind that for iterating over loops, the [async](https://github.com/caolan/async) library will be ideal due to AwaitScript's compatability with Node.

### Parallel processes

I'm not sure of the best syntax for this, but Yyu should be able to use the `async` keyword to start an asynchronous operation and get its result later.

Either this:

    var file1 = async fs.readFile('myfile.txt', 'utf-8') 
      , file2 = async fs.readFile('myotherfile.txt', 'utf-8');

    console.log((await file1) + " " + (await file2));

Or: 

    var file1 = async fs.readFile('myfile.txt', 'utf-8') 
      , file2 = async fs.readFile('myotherfile.txt', 'utf-8');

    await file1, file2;

    console.log(file1 + " " + file2);

### Anonymous awaits

Syntax:

    console.log((await fs.stat('myfile.txt')).size);

Right now you can only use `await` as a fire-and-forget option, or assign it to a variable. Ideally, you could insert `await [function]` anywhere into your code and use its value inline.