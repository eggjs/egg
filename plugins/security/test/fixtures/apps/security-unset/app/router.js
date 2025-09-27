module.exports = function (app) {
  app.get('/', function () {
    this.body = this.isSafeDomain('aaa-domain.com');
  });
  app.get('/safe', function () {
    this.body = this.isSafeDomain('www.domain.com');
  });
};
