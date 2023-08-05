'use strict';

const URL = require('url');
const Base = require('sdk-base');

class RegistryClient extends Base {
  constructor() {
    super();
    this._registered = new Map();
    this.ready(true);
  }

  /**
   * subscribe
   *
   * @param {Object} reg
   *   - {String} dataId - the dataId
   * @param {Function}  listener - the listener
   */
  subscribe(reg, listener) {
    const key = reg.dataId;
    this.on(key, listener);

    const data = this._registered.get(key);
    if (data) {
      process.nextTick(() => listener(data));
    }
  }

  /**
   * publish
   *
   * @param {Object} reg
   *   - {String} dataId - the dataId
   *   - {String} publishData - the publish data
   */
  publish(reg) {
    const key = reg.dataId;

    if (this._registered.has(key)) {
      const arr = this._registered.get(key);
      if (arr.indexOf(reg.publishData) === -1) {
        arr.push(reg.publishData);
      }
    } else {
      this._registered.set(key, [reg.publishData]);
    }
    this.emit(key, this._registered.get(key).map(url => new URL.parse(url, true)));
  }

  close() {
    this.closed = true;
  }
}

module.exports = RegistryClient;
