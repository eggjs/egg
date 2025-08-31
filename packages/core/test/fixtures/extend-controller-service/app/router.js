module.exports = app => {
  app.get('/success', 'api.successAction');
  app.get('/fail', 'api.failAction');
};
