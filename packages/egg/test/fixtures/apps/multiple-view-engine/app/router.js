'use strict';

module.exports = app => {
  app.get('/render-ejs', 'view.renderEjs');
  app.get('/render-nunjucks', 'view.renderNunjucks');
  app.get('/render-with-options', 'view.renderWithOptions');

  app.get('/render-string', 'view.renderString');
  app.get('/render-string-without-view-engine', 'view.renderStringWithoutViewEngine');
};
