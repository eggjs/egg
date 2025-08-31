const { scheduler } = require('node:timers/promises');

module.exports = class TimeoutHook {
  async didLoad() {
    await scheduler.wait(10);
  }
};
