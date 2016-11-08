'use strict';

module.exports = app => {
  const options = app.config.mock;

  app.mockClient = app.createAppWorkerClient('mock', {
    on(event, listner) {
      return this._on(event, listner);
    },
    once(event, listner) {
      return this._once(event, listner);
    },
    removeListener(event, listner) {
      return this._removeListener(event, listner);
    },
    removeAllListeners(event) {
      return this._removeAllListeners(event);
    },
    subscribe(reg, listner) {
      return this._subscribe(reg, listner);
    },
    unSubscribe(reg, listner) {
      return this._unSubscribe(reg, listner)
    },
    * getData(key) {
      return yield this._invoke('getData', [key]);
    },
    * getError() {
      return yield this._invoke('getError', []);
    },
    * getTimeout() {
      return yield this._invoke('getTimeout', []);
    },
    * getDataGenerator(key) {
      return yield this._invoke('getDataGenerator', [key]);
    },
    * save(key, value) {
      return yield this._invoke('save', [key, value]);
    },
    saveCallback(key, value, callback) {
      this._invoke('save', [key, value])
        .then(callback, callback);
    },
    saveAsync(key, value) {
      this._invokeOneway('save', [key, value]);
    },
  }, options);

  app.mockClient.ready(app.readyCallback('worker_mock_client'), {
    isWeakDep: app.config.runMode === 0,
  });
};
