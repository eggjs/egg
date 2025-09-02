module.exports = app => {
  app.get('home', '/', app.controller.home.hello);
};
