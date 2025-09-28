'use strict';

module.exports = app => {
  app.view.use(
    'nunjucks',
    class NunjucksView {
      render(filename) {
        return Promise.resolve(filename);
      }
      renderString() {
        return Promise.resolve('nunjucks');
      }
    }
  );
};
