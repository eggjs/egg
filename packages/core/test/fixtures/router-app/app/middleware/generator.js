'use strict';

module.exports = function () {
  return async function (ctx, next) {
    await next();
    ctx.body.push('generator');
  };
};
