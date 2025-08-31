'use strict';

module.exports = function () {
  return async (ctx, next) => {
    if (ctx.path === '/static') {
      ctx.set('static', 'static');
    }
    await next();
  };
};
