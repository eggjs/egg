module.exports = app => {
  app.get('home', '/', app.controller.home);
  app.get('async', '/async', 'async.index');
  app.get('empty', '/empty', app.controller.empty);
  // app.get('/only_require', app.controller.onlyRequire);
  app.get('/xss', app.controller.xss);
  app.post('/context', app.controller.context);
  app.get('/sjs', app.controller.sjs);
  app.get('/shtml', app.controller.shtml);
  app.get('/locals', app.controller.locals);
  app.get('/string', app.controller.string);
  app.get('/form_csrf', app.controller.csrf);
  app.get('/nonce', app.controller.nonce);
  app.get('/inject', app.controller.inject);
};
