module.exports = app => {
  app.get('/', ctx => {
    ctx.body = 'done';
  });

  app.get('/port', ctx => {
    ctx.body = ctx.app.options.port;
  });
};
