export default (app: any) => {
  app.router.get('/', async (ctx: any) => {
    ctx.body = 'Hello World';
  });
};
