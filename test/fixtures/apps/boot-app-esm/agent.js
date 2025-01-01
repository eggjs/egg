import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { Boot } from '../../../../src/index.js';

export default class CustomBoot extends Boot  {
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
    this.logger.info('agent is ready');
  }

  async beforeClose() {
    await scheduler.wait(1);
    this.agent.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await scheduler.wait(1);
    this.agent.bootLog.push('serverDidReady');
  }
}
