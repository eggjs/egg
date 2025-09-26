'use strict';

const Subscription = require('egg').Subscription;

class Interval extends Subscription {
  static get schedule() {
    return {
      type: 'cluster-all',
      interval: 4000,
    };
  }

  async subscribe(data) {
    this.ctx.logger.info('cluster_all_log_clz', data);
  }
}

module.exports = Interval;
