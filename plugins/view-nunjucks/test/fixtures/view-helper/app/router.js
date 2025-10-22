'use strict';

module.exports = app => {
  app.get('helper', '/helper', async function () {
    await this.render('helper.tpl', { user: 'egg' });
  });

  app.get('escape', '/escape', async function () {
    await this.render('escape.tpl', { user: 'egg' });
  });

  app.get('filters', '/nunjucks_filters', async function () {
    this.body = await this.renderString('{{ helper.upper(user) }}', {
      user: 'egg',
    });
  });
};
