'use strict';

module.exports = app => {
  app.get('/exit', async function() {
    process.exit(1);
  });

  app.get('/uncaughtException', async function() {
    setTimeout(() => {
      throw new Error('get uncaughtException');
    }, 100);
  });
};
