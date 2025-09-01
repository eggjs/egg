module.exports = app => {
  app.get('/throw', async function() {
    this.body = 'foo';
    setTimeout(() => {
      /* eslint-disable-next-line */
      a.b = c;
    }, 1);
  });

  app.get('/throw-unhandledRejection', async function() {
    this.body = 'foo';
    new Promise((resolve, reject) => {
      reject(new Error('foo reject error'));
    });
  });

  app.get('/throw-unhandledRejection-string', async function() {
    this.body = 'foo';
    new Promise((resolve, reject) => {
      reject(new Error('foo reject string error'));
    });
  });

  app.get('/throw-unhandledRejection-obj', async function() {
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
