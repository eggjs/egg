const assert = require('assert');
const { scheduler } = require('node:timers/promises');

module.exports = class CustomBoot {
  constructor(app) {
    this.app = app;
    app.bootLog = [];
    assert(this.app.config);
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
    this.app.logger.info('app is ready');
  }

  async beforeClose() {
    await scheduler.wait(1);
    this.app.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await scheduler.wait(1);
    this.app.bootLog.push('serverDidReady');
  }
};
