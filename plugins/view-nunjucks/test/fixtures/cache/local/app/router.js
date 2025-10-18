'use strict';

module.exports = app => {
  app.get('/', async function () {
    await this.render('home.tpl', { user: 'egg' });
  });
};
