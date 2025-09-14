'use strict';

module.exports = app => {
  const done = app.readyCallback('delay 200ms');
  setTimeout(() => {
    app.logger.info('delayed 200ms done.');
    done();
  }, 200);

  app.ready(() => {
    app.logger.info('Server started.');
  });
};
