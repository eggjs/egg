module.exports = app => {
  app.get('/foo.js', async function () {
    this.body = 'foo.js';
  });

  app.get('/foo', async function () {
    this.body = 'foo';
  });
};
