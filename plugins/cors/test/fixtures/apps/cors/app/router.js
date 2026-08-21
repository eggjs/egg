'use strict';

module.exports = (app) => {
  app.get('/', async (ctx) => {
    ctx.body = {
      foo: 'bar',
    };
  });

  app.post('/', async (ctx) => {
    ctx.body = {
      foo: 'bar',
    };
  });
};
