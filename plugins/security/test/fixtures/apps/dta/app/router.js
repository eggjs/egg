module.exports = function (app) {
  app.get('/test', function () {
    this.body = 111;
  });
};
