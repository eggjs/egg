'use strict';

const fs = require('mz/fs');

module.exports = function* () {
  this.body = 'hello';
  const fn = function* saveUserInfo(ctx) {
    const buf = yield fs.readFile(__filename);
    ctx.logger.warn('background run result file size: %s', buf.length);
  };
  fn._name = 'customTaskName';
  this.runInBackground(fn);
};
