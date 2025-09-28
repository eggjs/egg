'use strict';

module.exports = app => {
  app.view.use(
    'nunjucks',
    class NunjucksView {
      render() {
        return Promise.resolve('nunjucks');
      }
      renderString() {
        return Promise.resolve('nunjucks');
      }
    }
  );
};
