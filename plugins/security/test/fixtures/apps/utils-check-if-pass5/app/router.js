module.exports = function (app) {
  app.get('/', function () {
    this.body = 'xx';
  });
  app.get('/ignore1', function () {
    this.body = 'xx';
  });
  app.get('/ignore2', function () {
    this.body = 'xx';
  });
};
