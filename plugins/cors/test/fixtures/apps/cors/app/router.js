module.exports = (app) => {
  app.get('/', async (ctx) => {
    ctx.body = { foo: 'bar' };
  });
};
