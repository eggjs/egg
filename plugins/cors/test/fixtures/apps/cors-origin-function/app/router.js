module.exports = (app) => {
  app.get('/', async (ctx) => {
    ctx.body = { foo: 'bar' };
  });
  app.get('/config', async (ctx) => {
    ctx.body = {
      hasCustomOriginHandler: ctx.app.config.cors.hasCustomOriginHandler,
    };
  });
};
