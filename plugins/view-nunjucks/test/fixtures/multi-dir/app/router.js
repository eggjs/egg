'use strict';

module.exports = app => {
  app.get('/view', function* () {
    yield this.render('home.tpl', { user: 'egg' });
  });

  app.get('/ext', function* () {
    yield this.render('ext.tpl', { user: 'egg' });
  });

  app.get('/include', function* () {
    yield this.render('include.tpl', { user: 'egg' });
  });

  app.get('/relative', function* () {
    yield this.render('sub/relative-a.tpl', { user: 'egg' });
  });

  app.get('/import', function* () {
    yield this.render('import.tpl');
  });
};
