module.exports = function (app) {
  app.get('/', function () {
    this.body = '123';
  });

  app.get('/disable', function () {
    this.securityOptions.nosniff = { enable: false };
    this.body = '123';
  });

  app.get('/redirect', function () {
    this.redirect('/');
  });

  app.get('/redirect301', function () {
    this.status = 301;
    this.redirect('/');
  });

  app.get('/redirect307', function () {
    this.status = 307;
    this.redirect('/');
  });
};
