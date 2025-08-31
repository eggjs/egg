const assert = require('assert');
const { scheduler } = require('node:timers/promises');

module.exports = class CustomBoot {
  constructor(agent) {
    this.agent = agent;
    agent.bootLog = [];
    assert(this.agent.config);
    agent.messenger.on('egg-ready', () => {
      agent.messenger.sendToApp('agent2app');
    });
  }

  configDidLoad() {
    this.agent.bootLog.push('configDidLoad');
  }

  async didLoad() {
    await scheduler.wait(1);
    this.agent.bootLog.push('didLoad');
  }

  async willReady() {
    await scheduler.wait(1);
    this.agent.bootLog.push('willReady');
  }

  async didReady() {
    await scheduler.wait(1);
    this.agent.bootLog.push('didReady');
    this.agent.logger.info('agent is ready');
  }

  async beforeClose() {
    await scheduler.wait(1);
    this.agent.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await scheduler.wait(1);
    this.agent.bootLog.push('serverDidReady');
  }
};
