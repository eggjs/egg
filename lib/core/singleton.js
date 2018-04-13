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

  async init() {
    const options = this.options;
    assert(!(options.client && options.clients),
      `egg:singleton ${this.name} can not set options.client and options.clients both`);

    // alias app[name] as client, but still support createInstance method
    if (options.client) {
      const client = await this.createInstanceAsync(options.client);
      this.app[this.name] = client;
      assert(!client.createInstance, 'singleton instance should not have createInstance method');
      assert(!client.createInstanceAsync, 'singleton instance should not have createInstanceAsync method');
      client.createInstance = this.createInstance.bind(this);
      client.createInstanceAsync = this.createInstanceAsync.bind(this);
      return;
    }

    // multi clent, use app[name].getInstance(id)
    if (options.clients) {
      await Promise.all(Object.keys(options.clients).map(id => {
        return this.createInstanceAsync(options.clients[id])
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

  createInstance(config) {
    // async creator only support createInstanceAsync
    assert(!is.asyncFunction(this.create),
      `egg:singleton ${this.name} only support create asynchronous, please use createInstanceAsync`);
    // options.default will be merge in to options.clients[id]
    config = Object.assign({}, this.options.default, config);
    return this.create(config, this.app);
  }

  async createInstanceAsync(config) {
    if (typeof config === 'function') {
      // support config to be an async function or a normal function
      config = await config();
    }
    // options.default will be merge in to options.clients[id]
    config = Object.assign({}, this.options.default, config);
    return await this.create(config, this.app);
  }
}

module.exports = Singleton;
