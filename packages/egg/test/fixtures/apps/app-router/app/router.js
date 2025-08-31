module.exports = app => {
  app.get('home', '/', 'home');
  app.get('/home', app.controller.home);
};
