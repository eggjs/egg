'use strict';

module.exports = function(app) {
  app.messenger.on('app', () => console.log(process.pid, 'got'));
};
