'use strict';

module.exports = app => {
  app.get('/markdown', function* () {
    yield this.render('markdown.tpl', { user: 'egg' });
  });
};
