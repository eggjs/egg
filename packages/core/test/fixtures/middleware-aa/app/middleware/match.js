'use strict';

module.exports = function () {
  return async (ctx, next) => {
    ctx.set('match', 'match');
    await next();
  };
};
