const EventEmitter = require('events').EventEmitter;
const { sleep } = require('../../../../../utils');

class MockClient extends EventEmitter {
  constructor(options) {
    super();

    this.cache = new Map();

    setImmediate(function() {
      this.ready(true);
    }.bind(this));
  }

  ready(flagOrFunction) {
    this._ready = !!this._ready;
    this._readyCallbacks = this._readyCallbacks || [];

    if (typeof flagOrFunction === 'function') {
      this._readyCallbacks.push(flagOrFunction);
    } else {
      this._ready = !!flagOrFunction;
    }

    if (this._ready) {
      this._readyCallbacks.splice(0, Infinity).forEach(function(callback) {
        process.nextTick(callback);
      });
    }
    return this;
  }

  getCallback(key, callback) {
    setTimeout(function() {
      if (id === 'error') {
        callback(new Error('mock error'));
      } else {
        callback(null, this.cache.get(key));
      }
    }, 100);
  }

  getData(key) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.cache.get(key));
      }, 100);
    });
  }

  * getTimeout() {
    yield sleep(6000);
    return 'timeout';
  }

  * getDataGenerator(key) {
    yield sleep(100);
    return this.cache.get(key);
  }

  * save(key, value) {
    yield sleep(100);
    this.cache.set(key, value);
  }

  getError() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('mock error'));
      }, 100);
    });
  }
}

module.exports = MockClient;
