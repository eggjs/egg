'use strict';

const sleep = require('mz-modules/sleep');
module.exports = app => {
  app.beforeClose(function* () {
    yield sleep(6000);
  });
};
