module.exports = app => {
  app.get('/user.json', app.jsonp(), 'index.getUser');
  app.get('/', 'index.home');
};
