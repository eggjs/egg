
module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/clear', app.controller.clear);
};
