'use strict';

const assert = require('assert');
const INSTANCE = Symbol('BaseHookClass#instance');

class BaseHookClass {

  constructor(instance) {
    this[INSTANCE] = instance;
  }

  get logger() {
    return this[INSTANCE].logger;
  }

  get config() {
    return this[INSTANCE].config;
  }

  get app() {
    assert(this[INSTANCE].type === 'application', 'agent boot should not use app instance');
    return this[INSTANCE];
  }

  get agent() {
    assert(this[INSTANCE].type === 'agent', 'app boot should not use agent instance');
    return this[INSTANCE];
  }
}

module.exports = BaseHookClass;
