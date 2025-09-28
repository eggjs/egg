'use strict';

module.exports = app => {
  app.view.use(
    'ejs',
    class EjsView {
      render() {
        return Promise.resolve('ejs');
      }
      renderString() {
        return Promise.resolve('ejs');
      }
    }
  );
  app.view.use(
    'nunjucks',
    class EjsView {
      render() {
        return Promise.resolve('nunjucks');
      }
      renderString() {
        return Promise.resolve('nunjucks');
      }
    }
  );
};
