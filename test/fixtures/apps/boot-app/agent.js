const assert = require('assert');
const BaseHookClass = require('../../../../lib/core/base_hook_class');
const { sleep } = require('../../../utils');

module.exports = class extends BaseHookClass {
  constructor(agent) {
    super(agent);
    agent.bootLog = [];
    assert(this.config);
    agent.messenger.on('egg-ready', () => {
      agent.messenger.sendToApp('agent2app');
    });
  }

  configDidLoad() {
    this.agent.bootLog.push('configDidLoad');
  }

  async didLoad() {
    await sleep(1);
    this.agent.bootLog.push('didLoad');
  }

  async willReady() {
    await sleep(1);
    this.agent.bootLog.push('willReady');
  }

  async didReady() {
    await sleep(1);
    this.agent.bootLog.push('didReady');
    this.logger.info('agent is ready');
  }

  async beforeClose() {
    await sleep(1);
    this.agent.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await sleep(1);
    this.agent.bootLog.push('serverDidReady');
  }
};
