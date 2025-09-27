'use strict';

module.exports = app => {
  app.messenger.on('log-reload', () => {
    console.log('app got log-reload');
  });
};
