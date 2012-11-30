SUPPORT = __dirname + '/support';
DEBUG = SUPPORT + '/debug';
sh = require('shelljs');

/**
 * create debug dir
 */

if (!sh.test('-d', DEBUG)) sh.mkdir(DEBUG);

/**
 * util for saving debug files
 */

save = function (data, file) {
  if(typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  
  data.to(DEBUG + '/' + file);
}
