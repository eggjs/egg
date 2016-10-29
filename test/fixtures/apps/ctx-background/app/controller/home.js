'use strict';

module.exports = function* () {
  this.body = 'hello';
  this.runInBackground(function* saveUserInfo(ctx) {
    const domain = process.env.CI ? 'registry.npmjs.com' : 'registry.npm.taobao.org';
    const r = yield ctx.curl(`http://${domain}/pedding/latest`, { dataType: 'json' });
    ctx.logger.warn('background run result status: %s', r.status);
  });
};
