'use strict';

module.exports = function () {
  return async (ctx, next) => {
    await next();
    ctx.body.push('async');
  };
};
