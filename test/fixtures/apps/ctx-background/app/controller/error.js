'use strict';

module.exports = function* () {
  this.body = 'hello error';
  this.runInBackground(function* mockError(ctx) {
    const r = yield ctx.curl('http://registry-not-exists.npm.taobao.org/pedding/latest', { dataType: 'json' });
    ctx.logger.warn('background run result status: %s', r.status);
  });
};
