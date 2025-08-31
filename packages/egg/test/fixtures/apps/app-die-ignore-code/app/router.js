'use strict';

module.exports = app => {
  app.get('/uncaughtException', async function() {
    setTimeout(() => {
      const error = new Error('MockError');
      error.code = 'EMOCKERROR';
      throw error;
    }, 100);
  });
};
