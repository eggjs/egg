module.exports = app => {
  app.get('/exit', ctx => {
    setTimeout(() => {
      throw new Error('exit');
    }, 10);
    ctx.body = 'exit';
  });
};
