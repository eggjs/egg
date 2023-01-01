const { sleep } = require('../../../utils');

module.exports = app => {
  app.beforeStart(function*() {
    yield sleep(500);
    app.config.foo.push(app.config.foo);
  });
};
