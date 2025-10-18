'use strict';

module.exports = app => {
  app.get('helper', '/helper', function* () {
    yield this.render('helper.tpl', { user: 'egg' });
  });

  app.get('escape', '/escape', function* () {
    yield this.render('escape.tpl', { user: 'egg' });
  });

  app.get('filters', '/nunjucks_filters', function* () {
    this.body = yield this.renderString('{{ helper.upper(user) }}', { user: 'egg' });
  });
};
