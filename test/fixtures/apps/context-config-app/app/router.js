module.exports = app => {
  app.get('home', '/', 'home.index');
  app.get('runtime', '/runtime', 'home.runtime');
};
