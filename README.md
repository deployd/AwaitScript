# AwaitScript

A proof-of-concept JavaScript compiler designed to let you write asynchronous code as if it were synchronous.

## Hello World

Call any node-style async function and get the result without blocking or managing callbacks.

    // index.js
    require('awaitscript');
    require('./hello.ws');

    // hello.ws
    function bake(fn) {
      setTimeout(function() {
        fn(null, Math.PI);
      }, 10);
    }
    
    // start a non blocking task
    var pi = defer bake();
    
    // imediately log this
    console.log( 'Hello, World. Can I please have some pi?' );
    
    // only wait when we have to, without callbacks
    console.log( await pi ); // 3.141592653589793

Run the above code with `node` as you would **any other node program**.

    Ω node index.js
    Hello, World. Can I please have some pi?
    3.141592653589793

## Philosophy

AwaitScript is designed for Node.js; specifically the `fn(error, result)` callback pattern. All JavaScript should compile 1:1 unless you use the special AwaitScript keywords (`await`, `async`, `defer`). 

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

You can also use `await` in the body of an expression; AwaitScript will create a temporary variable:

    console.log(await fs.readFile('myfile.txt', 'utf-8'));

Compiles to:

    fs.readFile('myfile.txt', 'utf-8', function(err, __a) {
      if (err) throw err;
      console.log(__a);
    });


## Asynchronous functions

You can use the `async` keyword before a function definition to turn it into an asynchronous function with a callback. This allows you to use the `await` keyword inside the function body. An asynchronous function can also be awaited like any other function with a callback.

Syntax:

    async function doSomethingAsync(dir) {
      await fs.rmdir(dir + '/subdir');
      await fs.rmdir(dir);

      return "Finished!";
    }

    var result = await doSomethingAsync();
    console.log(result);

Compiles to:

    function doAsyncThing(fn) {
      fs.rmdir(dir + '/subdir', function(err) {
        if (err) return fn && fn(err);
        fs.rmdir(dir, function(err) {
          if (err) return fn && fn(err);
          return fn && fn("Finished!");
        });
      });
    }

    doSomethingAsync(function(err, result) {
      if (err) throw err;
      console.log(result);
    });

### Parallel processes

You can use the `defer` keyword to start an asynchronous operation and get its result later.

Syntax:

    var file1 = defer fs.readFile('myfile.txt', 'utf-8') 
      , file2 = defer fs.readFile('myotherfile.txt', 'utf-8');

    console.log(await file1 + " " + await file2);

### Using callbacks

Sometimes callbacks are actually the best way to do something, such as with streams or events. You can drop back into callback-style coding, and await the result. No special syntax is needed for this. Just defer (or await) a standard synchronous function with a callback:

Pattern:

    var task = defer function(callback) {
                    var readStream = fs.createReadStream("foo.txt");
                    var writeStream = fs.createWriteStream("bar.txt");
                    readStream.on('data', function(data) {
                        writeStream.write(data.toUpperCase());
                    }).on('error', function(err) {
                        writeStream.destroy();
                        callback(err);
                    }).on('end', function() {
                        callback();
                    }); 
                    
                    writeStream.on('error', function(err) {
                        readStream.destroy();
                        callback(err);
                    });
               };
               
    doSomethingElse();

    await task;


### Use in Existing Node Programs

Instead of running a transpiling step, AwaitScript runs a JIT compiler inside your existing node modules. This means module developers can use AwaitScript features without having to publish compiler steps or compiled code. Just include the AwaitScript node module as a dependency of your module and start using AwaitScript features. Including `require('awaitscript')` in any node module enables the JIT compiler for the current process.

_Note ~ this will not compile code in child processes / or VMs_

Usage:

    // my-module.js
    require('awaitscript');
    require('some-await-script.ws');

    // some-await-script.ws
    exports.txt = await require('fs').readFile('./hello.txt'));

Requiring and using a module written with AwaitScript is the exact same as any other module:

    // my-app.js
    console.log(require('./my-module.js'));

Since this is all 100% compatible with regular node, running the app is no different:

     $ node my-app.js
     Hello World

## Planned features

AwaitScript is *extremely* immature. This is only a proof-of-concept that we plan to develop.

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

### Support for non-conventional callbacks


Some functions in Node (like `fs.exists`) don't take a traditional `fn(err, result)` callback; these should be awaitable by using `awaitx`, which does not check for an error in the callback and returns the first argument.

Syntax:
    if (awaitx fs.exists('somefile.txt')) {
        console.log("File exists!");        
    }
    
You can also create functions without an error callback by using the `asyncx` keyword:

    require('async');
    
    var directories = awaitx async.filter(['foo', 'bar.txt', 'baz'], asyncx function(file) {
        try {
            return (await fs.stat(file)).isDirectory();
        } catch (ex) {
            return false;
        }
    });
    
(The `async.filter` function does not expect an error callback in its iterator function)

### Support for callbacks with multiple results

Some functions return multiple results from their callback, for example, the [request](https://github.com/mikeal/request) library has a callback signature of `fn(error, response, body)`.

Syntax:

    // Get both arguments
    var [response, body] = await request('http://my-api/posts');
    
    // Only interested in the body
    var body = await[1] request('http://my-api/posts');
    
To return multiple results from an async function, pass a comma-seperated list to "return":

    async function getFiles(dir) {
        var file1 = defer fs.readFile(dir + "/file1.txt");
        var file2 = defer fs.readFile(dir + "/file1.txt");
        
        return await file1, await file2;
    }
    
    var [file1, file2] = await getFiles('./config');
    

### Defer blocks

Syntax:

    var jsonData = defer {
        var file = await fs.readFile('config.json', 'utf-8');
        return JSON.parse(file);
    };

    var cleanFolder = defer {
         await fs.rmdir('mydir/img');
         await fs.rmdir('mydir');
    };

    // Do something else

    console.log(await jsonData);

    await cleanFolder;

This allows you to define a chain of processes (and optionally, a return value) that must happen asynchronously, without losing scope. This is reminiscent of "fcall" from the the [q](https://github.com/kriskowal/q) library, but this works natively with Node conventions without having to use wrappers.

### Overriding the callback

You should be able to skip the callback for the current `async` function in some cases; for instance, when writing Express middleware, you don't want to call `next()` if you call `res.end()`, but in AwaitScript, `next()` is implicit. You should be able to use the `returnx` keyword to just return from the function without running the callback.  

Syntax:
    
    app.use(async function(req, res) {
        if (req.url === "/hello") {
            res.end("Hello, World!");
            returnx;
        }
    });
    app.use(async function(req, res) {
        res.end("You didn't go to /hello");
        returnx;
    });
    
### Async Debugging

Using `await` and `async` will automatically add contextual information to the current `domain`. This means wherever an error is caught it will contain contextual information such as which `async` function was last called before the error, its line number in your source (instead of the compiled source).