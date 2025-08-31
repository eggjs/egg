module.exports = function (app) {
  app.get('/user', app.controller.user);
};
