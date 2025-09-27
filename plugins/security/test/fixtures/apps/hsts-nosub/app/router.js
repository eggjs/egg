module.exports = function (app) {
  app.get('/', function () {
    this.body = '123';
  });
};
