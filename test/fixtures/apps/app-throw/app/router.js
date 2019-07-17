'use strict';

module.exports = app => {
  app.get('/throw', function* () {
    this.body = 'foo';
    setTimeout(() => {
      a.b = c;
    }, 1);
  });

  app.get('/throw-error-setter', function* () {
    this.body = 'foo';
    setTimeout(() => {
      const err = new Error('abc');
      Object.defineProperty(err, "message", {
        get() { return 'abc' },
        set: undefined
      });
      throw err;
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

  app.get('/throw-unhandledRejection-obj', function* () {
    this.body = 'foo';
    new Promise((resolve, reject) => {
      const err = {
        name: 'TypeError',
        message: 'foo reject obj error',
        stack: new Error().stack,
        toString() {
          return this.name + ': ' + this.message;
        },
      };
      reject(err);
    });
  });
};
