module.exports = function (app) {
  app.get('/', async function () {
    this.body = '123';
  });
  app.get('/nosub', async function () {
    this.securityOptions.hsts = {
      includeSubdomains: false,
    };
    this.body = '123';
  });
};
