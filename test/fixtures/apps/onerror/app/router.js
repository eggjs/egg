module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/csrf', app.controller.home.csrf);
  app.post('/test', app.controller.home.test);
  app.get('/user.json', app.controller.user);
};
