module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/unknownFile', app.controller.home.unknownFile);
  app.get('/csrf', app.controller.home.csrf);
  app.post('/test', app.controller.home.test);
  app.get('/user', app.controller.user);
  app.get('/user.json', app.controller.user);
  app.get('/jsonp', app.jsonp(), app.controller.home.jsonp);
};
