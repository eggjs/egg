module.exports = function (app) {
  app.get('/get', 'home.get');
  app.get('/set', 'home.set');
  app.get('/setKey', 'home.setKey');
  app.get('/remove', 'home.remove');
  app.get('/maxAge', 'home.maxAge');
};
