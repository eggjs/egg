module.exports = app => {
  app.get('home', '/', app.controller.home.get);
  app.get('/hello', app.controller.home.hello);
  app.get('/service', app.controller.home.service);
  app.get('/service/old', app.controller.home.serviceOld);
  app.get('/header', app.controller.home.header);
  app.get('/urllib', app.controller.home.urllib);
  app.get('/mock_url', app.controller.home.mockUrlGet);
  app.get('/mock_url2', app.controller.home.mockUrlGet);
  app.post('/mock_url', app.controller.home.mockUrlPost);
  app.post('/mock_url2', app.controller.home.mockUrlPost);
  app.get('/mock_urllib', app.controller.home.mockUrllibHeaders);
  app.get('/data_type', app.controller.home.dataType);
  app.get('session', '/session', app.controller.session);

  app.post('/', app.controller.home.post);

  app.get('/user', app.controller.user.get);
  app.post('/user', app.controller.user.post);
  app.post('/file', app.controller.file);

  app.get('/streaming', 'home.streaming');
};
