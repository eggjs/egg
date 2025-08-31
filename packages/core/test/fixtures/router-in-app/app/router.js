'use strict';

module.exports = app => {
  app.get('/', ctx => {
    ctx.body = ctx.foo;
  });
};
