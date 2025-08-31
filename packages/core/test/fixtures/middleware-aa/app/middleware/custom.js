'use strict';

module.exports = function () {
  return async (ctx, next) => {
    ctx.set('custom', 'custom');
    await next();
  };
};
