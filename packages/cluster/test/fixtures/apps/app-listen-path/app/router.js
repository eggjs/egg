module.exports = app => {
  app.get('/', ctx => {
    ctx.body = 'done';
  });
};
