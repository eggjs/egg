'use strict';

const fs = require('mz/fs');

module.exports = function* () {
  this.body = 'hello app';
  this.app.runInBackground(function* saveUserInfo(ctx) {
    const buf = yield fs.readFile(__filename);
    ctx.logger.warn('mock background run at app result file size: %s', buf.length);
  });

  this.app.runInBackground(async ctx => {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('mock background run at app anonymous result file size: %s', buf.length);
  });
};
