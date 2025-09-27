module.exports = function (app) {
  app.get('/testcsp', function () {
    this.body = this.nonce;
  });
  app.get('/testcsp2', function () {
    this.body = this.nonce;
  });
};
