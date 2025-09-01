module.exports = function(app) {
  app.get('/', app.controller.home.get);
  app.get('/hello', app.controller.home.hello);
  app.get('/service', app.controller.home.service);
  app.get('/service/old', app.controller.home.serviceOld);
  app.get('/header', app.controller.home.header);
  app.get('/urllib', app.controller.home.urllib);
  app.get('/mock_url', app.controller.home.mockUrlGet);
  app.post('/mock_url', app.controller.home.mockUrlPost);
  app.get('/mock_urllib', app.controller.home.mockUrllibHeaders);
  app.get('/session', app.controller.session);

  app.post('/', app.controller.home.post);
};
