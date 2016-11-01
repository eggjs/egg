'use strict';

const fs = require('mz/fs');

module.exports = function* () {
  this.body = 'hello';
  this.runInBackground(function* saveUserInfo(ctx) {
    const buf = yield fs.readFile(__filename);
    ctx.logger.warn('background run result file size: %s', buf.length);
  });
};
