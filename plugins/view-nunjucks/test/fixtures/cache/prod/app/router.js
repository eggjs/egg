'use strict';

module.exports = app => {
  app.get('/', function* () {
    yield this.render('home.tpl', { user: 'egg' });
  });

  app.get('/sub', function* () {
    yield this.render('sub.tpl', { user: 'egg' });
  });
};
