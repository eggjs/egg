module.exports = app => {
  app.get('/testcsp', async function () {
    this.body = this.nonce;
  });
};
