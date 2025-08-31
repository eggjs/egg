'use strict';

const path = require('path');
const block = require('./block');

module.exports = app => {
  block();

  app.beforeStart(function* () {
    block();
  });

  app.beforeStart(function* () {
    block();
  }, 'mock Block');

  const cb = app.readyCallback('mockReadyCallbackWithoutFunction');
  setTimeout(cb, 1000);

  const directory = path.join(app.baseDir, 'app/proxy');
  app.loader.loadToContext(directory, 'proxy');

  app.loader.loadController();
};
