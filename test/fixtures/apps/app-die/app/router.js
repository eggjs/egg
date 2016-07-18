'use strict';

module.exports = app => {
  app.get('/exit', function*() {
    process.exit(1);
  });

  app.get('/uncaughtException', function*() {
    setTimeout(() => {
      throw new Error('get uncaughtException');
    }, 100);
  });
};
