function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.substring(1);
  } else {
    return content;
  }
};

if (require.extensions) {
  var fs = require('fs');
  var compile = require('./compiler').compile;
  
  require.extensions['.ws'] = function(module, filename) {
    var content;
    content = compile(stripBOM(fs.readFileSync(filename, 'utf8'))).output;
    
    return module._compile(content, filename);
  };
}