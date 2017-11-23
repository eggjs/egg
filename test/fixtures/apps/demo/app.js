'use strict';

module.exports = app => {
  app.ready(() => {
    app.config.tips = 'hello egg started';
  });
};
