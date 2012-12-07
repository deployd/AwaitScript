/*jshint evil:true*/

var compiler = require('./lib/compiler');
var path = require('path');
var sh = require('shelljs');

var esprima = require('./lib/esprima')
  , escodegen = require('./lib/escodegen')
  , transform = require('./lib/transform').transform;

var DEBUG = __dirname + "/debug";
var EXAMPLES = __dirname + "/examples";

/**
 * create debug dir
 */

if (!sh.test('-d', DEBUG)) {
  sh.mkdir(DEBUG);
}

/**
 * util for saving debug files
 */

function save (data, file) {
  if(typeof data !== 'string') {
    data = JSON.stringify(data, null, '  ');
  }
  
  data.to(DEBUG + '/' + file);
}

function removeLoc(obj) {
  var result;
  if( Object.prototype.toString.call( obj ) === '[object Array]' ) {
    result = [];
    obj.forEach(function(o) {
      result.push(removeLoc(o));
    });
    return result;
  } else if (obj === null) {
    return null;
  } else if (typeof obj === 'object') {
    result = {};
    Object.keys(obj).forEach(function(k) {
      if (k !== 'loc') {
        result[k] = removeLoc(obj[k]);
      }
    });
    return result;
  } else {
    return obj;
  }
}

var sample = process.argv[2];
if (!sample) {
  sample = EXAMPLES + '/sample.ws';
} else if (sample.indexOf('.ws') !== sample.length - 3) {
  sample = EXAMPLES + '/' + sample + '.ws';
}

var fileName = path.basename(sample, '.ws');

var source = sh.cat(sample);
var ast, transformed, output;
try {
  ast = esprima.parse(source, {loc: true});
  save(removeLoc(ast), fileName + '-ast.json');
  transformed = transform(ast);
  save(removeLoc(transformed), fileName + '-transformed-ast.json');
  output = escodegen.generate(transformed);
  save(output, fileName + '.js');
} catch (ex) {
  
  if (ex.messages) {
    console.error(ex.message);
    ex.messages.forEach(function(err) {
      console.error(' - ' + err);
    });
    if (ex.newAst) {
      save(removeLoc(ex.newAst), fileName + '-transformed-ast.json');
    }
  } else {
    console.error(ex.stack);
  }
}

eval(output);