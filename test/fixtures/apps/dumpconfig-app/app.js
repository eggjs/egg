const sleep = require('ko-sleep');

module.exports = app => {
  app.config.dynamic = 1;
  app.beforeStart(function*() {
    yield sleep(1000);
    app.config.dynamic = 2;
  });
};
