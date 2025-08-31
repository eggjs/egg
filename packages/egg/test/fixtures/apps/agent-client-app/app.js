'use strict';

module.exports = function initApp(app) {
  app.subClient = app.createAppWorkerClient('sub-client', {
    subscribe(info, listener) {
      this._subscribe(info, listener);
      return this;
    },
  });
};
