'use strict';

module.exports = app => {
  return class LoggerExample extends app.Subscription {
    static get schedule() {
      return {
        type: 'worker',
        cron: '0 0 3 * * *',
        immediate: true,
      };
    }

    async subscribe() {
      this.ctx.logger.info('Info about your task');
    }
  }
};
