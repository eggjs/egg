module.exports = class BootHook {
  constructor(app) {
    this.app = app;
    this.app.bootLog = this.app.bootLog || [];
  }

  async beforeClose() {
    this.app.bootLog.push('beforeClose in app');
  }
};
