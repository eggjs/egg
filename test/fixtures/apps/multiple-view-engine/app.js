'use strict';

module.exports = app => {
  app.view.use('ejs', require('./ejs'));
  app.view.use('nunjucks', require('./nunjucks'));
};
