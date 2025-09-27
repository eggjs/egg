const { METHODS } = require('node:http');

module.exports = function (app) {
  METHODS.forEach(function (m) {
    m = m.toLowerCase();
    app.router[m] &&
      app.router[m]('/', async function () {
        this.body = '123';
      });
  });
};
