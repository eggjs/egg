'use strict';

module.exports = app => {
  app.use(require('./app/middleware/custom')());
};
