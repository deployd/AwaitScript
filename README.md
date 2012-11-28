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

## Asynchronous functions (incomplete)

You can use the `async` keyword before a function definition to turn it into an asynchronous function with a callback. This allows you to use the `await` keyword inside the function body. An asynchronous function can also be awaited like any other function with a callback.

Syntax:

    async function doSomethingAsync(dir) {
      await fs.rmdir(dir + '/subdir');
      await fs.rmdir(dir);
    }

    await doSomethingAsync();
    console.log("Finished");

Compiles to:

    function doAsyncThing(fn) {
      fs.rmdir(dir + '/subdir', function(err) {
        if (err) return fn(err);
        fs.rmdir(dir, function(err) {
          if (err) return fn(err);
          fn();
        });
      });
    }

    doSomethingAsync(function(err) {
      if (err) throw err;
      console.log("Finished!");
    });

*Note: does not yet support the `return` keyword*

## Planned features

AwaitScript is *extremely* immature. This is only a proof-of-concept that I plan to develop.

### Asynchronous functions with return values

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

I'm not sure of the best syntax for this, but you should be able to use the `async` keyword to start an asynchronous operation and get its result later.

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

### Support for non-conventional callbacks

Some functions in Node (like `fs.exists`) don't take a traditional `fn(err, result)` callback. Others have multiple results (e.g. `fn(err, result1, result2)`).

It should be possible to call these (and possibly create functions like them) with AwaitScript. I have no idea what the syntax will be on this.

### Async immediate calls

Syntax:

    var jsonData = async {
        var file = await fs.readFile('config.json', 'utf-8');
        return JSON.parse(file);
    };

    var cleanFolder = async {
         await fs.rmdir('mydir/img');
         await fs.rmdir('mydir');
    };

    // Do something else

    console.log(await jsonData);

    await cleanFolder;

This allows you to define a chain of processes (and optionally, a return value) that must happen asynchronously, without losing scope.