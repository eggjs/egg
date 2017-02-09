'use strict';

module.exports = () => {
  return async (ctx, next) => {
    ctx.body = [];
    await next();
    ctx.body.push('middleware');
  };
};
