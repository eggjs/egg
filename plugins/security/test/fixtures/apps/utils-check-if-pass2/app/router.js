module.exports = function (app) {
  app.get('/match', function () {
    this.body = 'hello';
  });
  app.get('/mymatch', function () {
    this.body = 'hello';
  });
  app.get('/mytrueignore', function () {
    this.body = 'hello';
  });
};
