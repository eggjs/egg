module.exports = function (app) {
  app.get('/', function () {
    this.body = '123';
  });

  app.get('/disable', function () {
    this.securityOptions.noopen = { enable: false };
    this.body = '123';
  });
};
