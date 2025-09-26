'use strict';

exports.bar = function (ctx) {
  ctx.body = 'hello world';
  ctx.type = 'text';
  ctx.status = 200;
};
