'use strict';

module.exports = app => {
  app.get('/render-ejs', 'view.renderEjs');
  app.get('/render-nunjucks', 'view.renderNunjucks');
  app.get('/render-with-options', 'view.renderWithOptions');
  app.get('/render-without-ext', 'view.renderWithoutExt');
  app.get('/render-ext-without-config', 'view.renderExtWithoutConfig');
  app.get('/render-without-view-engine', 'view.renderWithoutViewEngine');
  app.get('/render-multiple-root', 'view.renderMultipleRoot');
  app.get('/render-multiple-root-without-extenstion', 'view.renderMultipleRootWithoutExtension');
  app.get('/load-same-file', 'view.loadSameFile');
  app.get('/load-file-noexist', 'view.loadFileNoexist');

  app.get('/render-string', 'view.renderString');
  app.get('/render-string-without-view-engine', 'view.renderStringWithoutViewEngine');
  app.get('/render-locals', 'view.renderLocals');
  app.get('/render-string-locals', 'view.renderStringLocals');
  app.get('/render-string-twice', 'view.renderStringTwice');
  app.get('/render-original-locals', 'view.renderOriginalLocals');

  app.get('/render-async', 'view.renderAsync');
  app.get('/render-string-async', 'view.renderStringAsync');
};
