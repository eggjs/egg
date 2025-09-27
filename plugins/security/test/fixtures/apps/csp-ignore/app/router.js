module.exports = function (app) {
  app.get('/testcsp', async function () {
    this.body = this.nonce;
  });
  app.get('/api/update', async function () {
    this.body = 456;
  });
  app.get('/ignore/update', async function () {
    this.body = 456;
  });
};
