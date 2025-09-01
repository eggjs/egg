module.exports = app => {
  app.get('/', ctx => {
    ctx.body = {
      beforeReady: app.beforeReady,
      afterReady: app.listeners('error').length,
    };
  });
};
