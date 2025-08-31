'use strict';

let index = 0;

module.exports = function exports() {
  return async (ctx, next) => {
    await next();
    ctx.body.push(`async middleware #${++index}`);
  };
};
