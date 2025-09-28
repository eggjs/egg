'use strict';

module.exports = app => {
  app.get('/render', 'view.render');
  app.get('/render-string', 'view.renderString');
};
