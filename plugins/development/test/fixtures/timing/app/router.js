module.exports = app => {
  app.get('/checkFile', async ctx => {
    ctx.body = ctx.app.checkFile();
  });
};
