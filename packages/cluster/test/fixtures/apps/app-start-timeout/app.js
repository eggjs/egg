'use strict';

module.exports = function(app) {
  const done = app.readyCallback('app-timeout');
  setTimeout(done, 30000);
};
