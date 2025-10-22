'use strict';

module.exports = (app) => {
  app.get('/markdown', async function () {
    await this.render('markdown.tpl', { user: 'egg' });
  });
};
