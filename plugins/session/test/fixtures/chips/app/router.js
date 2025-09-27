module.exports = app => {
  app.get('/get', 'home.get');
  app.get('/set', 'home.set');
};
