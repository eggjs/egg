'use strict';

module.exports = app => {
  const options = app.config.mock;

  app.mockClient = app.createAppWorkerClient('mock', {
    subscribe: function(reg, listner) {
      this._subscribe(reg, listner);
      return this;
    },

    * getData(id) {
      return yield this._invoke('getData', [id]);
    },

    * getError() {
      return yield this._invoke('getError', []);
    },

    * getDataGenerator(id) {
      return yield this._invoke('getDataGenerator', [id]);
    },
  }, options);

  app.mockClient.ready(app.readyCallback('worker_mock_client'), {
    isWeakDep: app.config.runMode === 0,
  });
};
