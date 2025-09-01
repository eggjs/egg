module.exports = app => {
  app.get('/exception-app', ctx => {
    setTimeout(() => {
      throw new Error('error');
    }, 1);
    ctx.body = 'done';
  });

  app.get('/exception-agent', ctx => {
    app.messenger.sendToAgent('throw');
    ctx.body = 'done';
  });
};
