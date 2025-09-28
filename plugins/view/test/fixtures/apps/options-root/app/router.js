module.exports = app => {
  app.get('/', async ctx => {
    await ctx.render('sub/a.html');
  });

  app.get('/absolute', async ctx => {
    await ctx.render('/sub/a.html');
  });
};
