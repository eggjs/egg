'use strict';

const BaseHookClass = require('./lib/core/base_hook_class');

class EggAgentHook extends BaseHookClass {
  configDidLoad() {
    this.agent._wrapMessenger();
  }
}

module.exports = EggAgentHook;
