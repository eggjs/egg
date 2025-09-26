'use strict';

exports.schedule = {
  type: 'worker',
  immediate: true,
  cron: '*/5 * * * * *',
};

exports.task = async function (ctx) {
  ctx.logger.info('immediate-cron');
};
