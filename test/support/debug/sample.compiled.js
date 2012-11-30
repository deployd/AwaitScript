var fs = require('fs'), file = 'not loaded';
function doAsyncThing(fn) {
    fs.readFile('read-this-file.txt', 'utf-8', function (err, data) {
        if (err)
            return fn && fn(err);
        file = data;
        fn();
    });
}
doAsyncThing(function (err) {
    if (err)
        throw err;
    console.log(file);
    fs.readFile('read-this-file.txt', 'utf-8', function (err, file2) {
        if (err)
            throw err;
        console.log('file2: ' + file2 + ' too');
    });
});