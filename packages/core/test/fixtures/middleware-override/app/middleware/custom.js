'use strict';

module.exports = function () {
  return async function appCustom(ctx) {
    ctx.body = 'app custom';
  };
};
