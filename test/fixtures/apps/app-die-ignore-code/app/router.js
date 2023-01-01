'use strict';

module.exports = app => {
  app.get('/uncaughtException', function*() {
    setTimeout(() => {
      const error = new Error('MockError');
      error.code = 'EMOCKERROR';
      throw error;
    }, 100);
  });
};
