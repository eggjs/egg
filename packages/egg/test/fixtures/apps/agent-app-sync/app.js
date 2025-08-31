'use strict';

module.exports = app => {
  const done = app.readyCallback();
  const test = app.createAppWorkerClient('test', {
    listen(cb) {
      this._subscribe('listening', cb);
    },
  });
  test.listen(arg => {
    app.arg = arg;
    done();
  })
};
