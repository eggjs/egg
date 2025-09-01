module.exports = app => {
  app.get('/', ctx => {
    ctx.body = ctx.app.serverEmit;
  });
};
