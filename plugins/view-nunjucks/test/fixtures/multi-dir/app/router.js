'use strict';

module.exports = app => {
  app.get('/view', async function () {
    await this.render('home.tpl', { user: 'egg' });
  });

  app.get('/ext', async function () {
    await this.render('ext.tpl', { user: 'egg' });
  });

  app.get('/include', async function () {
    await this.render('include.tpl', { user: 'egg' });
  });

  app.get('/relative', async function () {
    await this.render('sub/relative-a.tpl', { user: 'egg' });
  });

  app.get('/import', async function () {
    await this.render('import.tpl');
  });
};
