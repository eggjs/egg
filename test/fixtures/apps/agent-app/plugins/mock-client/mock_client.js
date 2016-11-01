'use strict';

const EventEmitter = require('events').EventEmitter;
const sleep = require('ko-sleep');

class MockClient extends EventEmitter {
  constructor(options) {
    super();

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

  getCallback(id, callback) {
    setTimeout(function() {
      if (id === 'error') {
        callback(new Error('mock error'));
      } else {
        callback(null, 'mock data');
      }
    }, 100);
  }

  getData() {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve('mock data');
      }, 100);
    });
  }

  * getDataGenerator() {
    yield sleep(100);
    return 'mock data';
  }

  getError() {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('mock error'));
      }, 100);
    });
  }
}

module.exports = MockClient;
