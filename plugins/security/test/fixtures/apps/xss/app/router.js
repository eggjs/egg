module.exports = function (app) {
  app.get('/', function () {
    this.body = '123';
  });

  app.get('/0', function () {
    this.securityOptions.xssProtection = {
      value: 0,
    };
    this.body = '123';
  });
};
