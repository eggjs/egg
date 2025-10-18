'use strict';

module.exports = app => {
  app.get('/', function* () {
    yield this.render('home.tpl', { user: 'egg' });
  });
};
