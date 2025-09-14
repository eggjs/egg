export default app => {
  app.get('/', async function () {
    this.body = {
      fooPlugin: app.fooPlugin,
      foo: 'bar',
    };
  });
};
