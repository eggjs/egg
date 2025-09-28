const fs = require('fs');
const assert = require('assert');
const path = require('path');

process.stdout.write(
  fs.existsSync(path.resolve(__dirname, '../../typings/app/controller/index.d.ts')) 
    ? 'done'
    : 'fail'
);

module.exports = class Controller {};