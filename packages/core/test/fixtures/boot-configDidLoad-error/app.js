const { scheduler } = require('node:timers/promises');

module.exports = class {
  constructor(app) {
    app.bootLog = [];
    this.app = app;
  }

  configDidLoad() {
    throw new Error('configDidLoad error');
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
  }

  async beforeClose() {
    await scheduler.wait(1);
    this.app.bootLog.push('beforeClose');
  }
};
