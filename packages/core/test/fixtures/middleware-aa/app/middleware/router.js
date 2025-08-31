'use strict';

module.exports = function () {
  return async (ctx, next) => {
    ctx.set('router', 'router');
    await next();
  };
};
