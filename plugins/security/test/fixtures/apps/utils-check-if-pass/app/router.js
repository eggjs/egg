module.exports = function (app) {
  app.get('/match', function () {
    this.body = 'hello';
  });
  app.get('/luckydrq', function () {
    this.body = 'hello';
  });
};
