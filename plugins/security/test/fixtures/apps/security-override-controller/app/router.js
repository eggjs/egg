module.exports = function (app) {
  app.get('/', function () {
    delete this.response.header['Strict-Transport-Security'];
    delete this.response.header['X-Download-Options'];
    delete this.response.header['X-Content-Type-Options'];
    delete this.response.header['X-XSS-Protection'];
    this.body = this.isSafeDomain('aaa-domain.com');
  });
  app.get('/safe', function () {
    this.body = this.isSafeDomain('www.domain.com');
  });
};
