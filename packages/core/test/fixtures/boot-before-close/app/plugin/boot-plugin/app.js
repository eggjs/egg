module.exports = class BootHook {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {
    this.app.bootLog.push('beforeClose in plugin');
  }
};
