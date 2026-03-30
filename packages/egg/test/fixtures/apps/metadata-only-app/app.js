module.exports = class MetadataOnlyBoot {
  constructor(app) {
    this.app = app;
    app.bootLog = [];
  }

  configWillLoad() {
    this.app.bootLog.push('configWillLoad');
  }

  configDidLoad() {
    this.app.bootLog.push('configDidLoad');
  }

  async didLoad() {
    this.app.bootLog.push('didLoad');
  }

  async willReady() {
    this.app.bootLog.push('willReady');
  }

  async didReady() {
    this.app.bootLog.push('didReady');
  }

  async serverDidReady() {
    this.app.bootLog.push('serverDidReady');
  }

  async beforeClose() {
    this.app.bootLog.push('beforeClose');
  }

  async loadMetadata() {
    this.app.bootLog.push('loadMetadata');
  }
};
