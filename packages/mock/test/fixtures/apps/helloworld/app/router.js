export default app => {
  app.get('/', async ctx => {
    ctx.body = {
      hello: 'world',
    };
  });
};
