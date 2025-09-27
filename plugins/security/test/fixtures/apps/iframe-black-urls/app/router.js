module.exports = function (app) {
  app.get('/hello', controller);
  app.get('/hello/other/world', controller);

  async function controller() {
    this.body = 'body';
  }
};
