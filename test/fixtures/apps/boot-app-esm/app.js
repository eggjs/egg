import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { Boot } from '../../../../src/index.js';

export default class CustomBoot extends Boot  {
  constructor(app) {
    super(app);
    app.bootLog = [];
    assert(this.config);
    assert(this.fullPath);
    app.messenger.on('agent2app', () => {
      app.messengerLog = true;
    });
  }

  configDidLoad() {
    this.app.bootLog.push('configDidLoad');
  }

  async didLoad() {
    await scheduler.wait(1);
    this.app.bootLog.push('didLoad');
  }

  async willReady() {
    await scheduler.wait(1);
    this.app.bootLog.push('willReady');
  }

  async didReady() {
    await scheduler.wait(1);
    this.app.bootLog.push('didReady');
    this.logger.info('app is ready');
  }

  async beforeClose() {
    await scheduler.wait(1);
    this.app.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await scheduler.wait(1);
    this.app.bootLog.push('serverDidReady');
  }
}
