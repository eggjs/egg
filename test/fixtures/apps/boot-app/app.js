const assert = require('assert');
const BaseHookClass = require('../../../../lib/core/base_hook_class');
const { sleep } = require('../../../utils');

module.exports = class extends BaseHookClass {
  constructor(app) {
    super(app);
    app.bootLog = [];
    assert(this.config);
    app.messenger.on('agent2app', () => {
      app.messengerLog = true;
    });
  }

  configDidLoad() {
    this.app.bootLog.push('configDidLoad');
  }

  async didLoad() {
    await sleep(1);
    this.app.bootLog.push('didLoad');
  }

  async willReady() {
    await sleep(1);
    this.app.bootLog.push('willReady');
  }

  async didReady() {
    await sleep(1);
    this.app.bootLog.push('didReady');
    this.logger.info('app is ready');
  }

  async beforeClose() {
    await sleep(1);
    this.app.bootLog.push('beforeClose');
  }

  async serverDidReady() {
    await sleep(1);
    this.app.bootLog.push('serverDidReady');
  }
};
