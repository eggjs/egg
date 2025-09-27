module.exports = function (app) {
  app.get('/', function () {
    this.body = 'xx';
  });
  app.get('/match1', function () {
    this.body = 'xx';
  });
  app.get('/match2', function () {
    this.body = 'xx';
  });
};
