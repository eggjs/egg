'use strict';

const assert = require('assert');
const is = require('is-type-of');

class Singleton {
  constructor(options = {}) {
    assert(options.name, '[egg:singleton] Singleton#constructor options.name is required');
    assert(options.app, '[egg:singleton] Singleton#constructor options.app is required');
    assert(options.create, '[egg:singleton] Singleton#constructor options.create is required');
    assert(!options.app[options.name], `${options.name} is already exists in app`);
    this.clients = new Map();
    this.app = options.app;
    this.name = options.name;
    this.create = options.create;
    /* istanbul ignore next */
    this.options = options.app.config[this.name] || {};
  }

  init() {
    return is.asyncFunction(this.create) ? this.initAsync() : this.initSync();
  }

  initSync() {
    const options = this.options;
    assert(!(options.client && options.clients),
      `egg:singleton ${this.name} can not set options.client and options.clients both`);

    // alias app[name] as client, but still support createInstance method
    if (options.client) {
      const client = this.createInstance(options.client, options.name);
      this.app[this.name] = client;
      this._extendDynamicMethods(client);
      return;
    }

    // multi clent, use app[name].getInstance(id)
    if (options.clients) {
      Object.keys(options.clients).forEach(id => {
        const client = this.createInstance(options.clients[id], id);
        this.clients.set(id, client);
      });
      this.app[this.name] = this;
      return;
    }

    // no config.clients and config.client
    this.app[this.name] = this;
  }

  async initAsync() {
    const options = this.options;
    assert(!(options.client && options.clients),
      `egg:singleton ${this.name} can not set options.client and options.clients both`);

    // alias app[name] as client, but still support createInstance method
    if (options.client) {
      const client = await this.createInstanceAsync(options.client, options.name);
      this.app[this.name] = client;
      this._extendDynamicMethods(client);
      return;
    }

    // multi clent, use app[name].getInstance(id)
    if (options.clients) {
      await Promise.all(Object.keys(options.clients).map(id => {
        return this.createInstanceAsync(options.clients[id], id)
          .then(client => this.clients.set(id, client));
      }));
      this.app[this.name] = this;
      return;
    }

    // no config.clients and config.client
    this.app[this.name] = this;
  }

  get(id) {
    return this.clients.get(id);
  }

  createInstance(config, clientName) {
    // async creator only support createInstanceAsync
    assert(!is.asyncFunction(this.create),
      `egg:singleton ${this.name} only support create asynchronous, please use createInstanceAsync`);
    // options.default will be merge in to options.clients[id]
    config = Object.assign({}, this.options.default, config);
    return this.create(config, this.app, clientName);
  }

  async createInstanceAsync(config, clientName) {
    // options.default will be merge in to options.clients[id]
    config = Object.assign({}, this.options.default, config);
    return await this.create(config, this.app, clientName);
  }

  _extendDynamicMethods(client) {
    assert(!client.createInstance, 'singleton instance should not have createInstance method');
    assert(!client.createInstanceAsync, 'singleton instance should not have createInstanceAsync method');

    try {
      let extendable = client;
      // Object.preventExtensions() or Object.freeze()
      if (!Object.isExtensible(client) || Object.isFrozen(client)) {
        // eslint-disable-next-line no-proto
        extendable = client.__proto__ || client;
      }
      extendable.createInstance = this.createInstance.bind(this);
      extendable.createInstanceAsync = this.createInstanceAsync.bind(this);
    } catch (err) {
      this.app.logger.warn('egg:singleton %s dynamic create is disabled because of client is unextensible', this.name);
    }
  }
}

module.exports = Singleton;
