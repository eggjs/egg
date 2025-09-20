module.exports = app => {
  app.get('/mockerror', async () => {
    // eslint-disable-next-line
    hi.foo();
  });

  app.get('/mock4xx', async () => {
    const err = new Error('4xx error');
    err.status = 400;
    throw err;
  });

  app.get('/500', async ctx => {
    ctx.status = 500;
    ctx.body = 'hi, this custom 500 page';
  });

  app.get('/special', async ctx => {
    ctx.errorPageUrl = '/specialerror';
    // eslint-disable-next-line
    hi.foo();
  });
};
