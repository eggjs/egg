'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = app => {
  app.router.get('/', async ctx => {
    ctx.body = 'Hello World';
  });
};
