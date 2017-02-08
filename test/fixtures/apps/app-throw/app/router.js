'use strict';

module.exports = app => {
  app.get('/throw', function* () {
    this.body = 'foo';
    setTimeout(() => {
      a.b = c;
    }, 1);
  });

  app.get('/throw-unhandledRejection', function* () {
    this.body = 'foo';
    new Promise((resolve, reject) => {
      reject(new Error('foo reject error'));
    });
  });

  app.get('/throw-unhandledRejection-string', function* () {
    this.body = 'foo';
    new Promise((resolve, reject) => {
      reject('foo reject string error');
    });
  });
};
