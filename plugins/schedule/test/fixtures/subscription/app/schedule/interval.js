const Subscription = require('egg').Subscription;

class Interval extends Subscription {
  static get schedule() {
    return {
      type: 'worker',
      interval: 4000,
    };
  }

  async subscribe() {
    this.ctx.logger.info('interval');
  }
}

module.exports = Interval;
