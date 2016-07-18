module.exports = app => {
  app.get('/user.json', app.controller.index.getUser);
  app.get('/', app.controller.index.home);
};
