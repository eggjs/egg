'use strict';

module.exports = app => {
  app.get('/render', 'view.render');
};
