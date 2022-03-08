const co = require('co');
const path = require('path');
const jsdoc = require('egg-doctools/lib/jsdoc');

co(function* () {
  const baseDir = process.cwd();
  const target = path.resolve(__dirname, '../site/dist/api')

  console.log('#jsdoc: generate from', baseDir);
  console.log('#jsdoc: generate to', target);

  yield jsdoc({ baseDir, target });  

  console.log('#jsdoc: done');
});
