'use strict';

module.exports = (app) => {
  app.get('/', async (ctx) => {
    ctx.body = {
      foo: 'bar',
    };
  });

  app.get('/config', async (ctx) => {
    ctx.body = {
      hasCustomOriginHandler: ctx.app.config.cors.hasCustomOriginHandler,
    };
  });

  app.post('/', async (ctx) => {
    ctx.body = {
      foo: 'bar',
    };
  });
};
