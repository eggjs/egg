'use strict';

module.exports = function(app) {
  let count = 1;
  app.messenger.on('agent2app', () => console.log('%s=%s', process.pid, count++));
};
