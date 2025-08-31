'use strict';

module.exports = function () {
  return async function (ctx, next) {
    if (ctx.path === '/static') {
      ctx.body = 'static';
      return;
    }
    await next();
  };
};
