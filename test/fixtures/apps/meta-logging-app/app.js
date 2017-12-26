'use strict';

module.exports = app => {
  app.ready(() => {
    app.config.tips = 'hello egg started';
    // dynamic router
    app.all('/all', app.controller.home);
  });
};
