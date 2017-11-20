'use strict';

const fs = require('mz/fs');

module.exports = function* () {
  this.body = 'hello';
  this.runInBackground(function* saveUserInfo(ctx) {
    const buf = yield fs.readFile(__filename);
    ctx.logger.warn('background run result file size: %s', buf.length);
  });
  this.runInBackground(async ctx => {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('mock background run anonymous result file size: %s', buf.length);
  });
};
