module.exports = function (app) {
  app.get('/ignore', function () {
    this.body = 'hello';
  });
  app.get('/luckydrq', function () {
    this.body = 'hello';
  });
};
