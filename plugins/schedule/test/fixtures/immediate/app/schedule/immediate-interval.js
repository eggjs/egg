'use strict';

exports.schedule = {
  type: 'worker',
  immediate: true,
  interval: 4000,
};

exports.task = async function (ctx) {
  ctx.logger.info('immediate-interval');
};
