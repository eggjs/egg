'use strict';

const safetimers = require('safe-timers');

module.exports = agent => {
  safetimers.maxInterval = 4000;

  const proto = safetimers.Timeout.prototype;
  const originFn = proto.reschedule;

  proto.reschedule = function (...args) {
    agent.logger.info('reschedule', ...args);
    originFn.call(this, ...args);
  };
};
