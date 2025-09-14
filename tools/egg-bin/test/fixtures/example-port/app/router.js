module.exports = app => {
  app.get('/', ctx => {
    ctx.body = 'hi, egg';
  });
};
