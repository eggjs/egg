module.exports = function (app) {
  app.get('/ignore', function () {
    this.body = 'hello';
  });
  app.get('/myignore', function () {
    this.body = 'hello';
  });
};
