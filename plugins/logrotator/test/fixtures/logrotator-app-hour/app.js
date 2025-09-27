'use strict';

module.exports = function (app) {
  app.messenger.on('log-reload', () => console.log('app got log-reload'));
};
