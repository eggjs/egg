module.exports = app => {
  app.get('/', ctx => {
    ctx.body = 'https server';
  });
};
