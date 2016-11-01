'use strict';

const fs = require('mz/fs');

module.exports = function* () {
  this.body = 'hello error';
  this.runInBackground(function* mockError(ctx) {
    const buf = yield fs.readFile(__filename + '-not-exists');
    ctx.logger.warn('background run result file size: %s', buf.length);
  });
};
