'use strict';

module.exports = function () {
  return function (ctx, next) {
    return next().then(() => (ctx.body = 'common'));
  };
};
