'use strict';

const assert = require('assert');

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
    const options = this.options;
    assert(!(options.client && options.clients),
      `egg:singleton ${this.name} can not set options.client and options.clients both`);

    // alias app[name] as client, but still support createInstance method
    if (options.client) {
      const client = this.createInstance(options.client);
      this.app[this.name] = client;
      assert(!client.createInstance, 'singleton instance should not have createInstance method');
      client.createInstance = this.createInstance.bind(this);
      return;
    }

    // multi clent, use app[name].getInstance(id)
    if (options.clients) {
      for (const id in options.clients) {
        this.clients.set(id, this.createInstance(options.clients[id]));
      }
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
    // options.default will be merge in to options.clients[id]
    config = Object.assign({}, this.options.default, config);
    return this.create(config, this.app);
  }
}

module.exports = Singleton;
