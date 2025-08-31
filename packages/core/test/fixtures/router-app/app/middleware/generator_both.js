'use strict';

module.exports = function () {
  return async function (ctx, next) {
    ctx.body = [];
    ctx.body.push('generator before');
    await next();
    ctx.body.push('generator after');
  };
};
