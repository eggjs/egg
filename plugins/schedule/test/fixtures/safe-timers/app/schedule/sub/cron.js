'use strict';

exports.schedule = {
  type: 'worker',
  cron: '*/5 * * * * *',
};

exports.task = async function (ctx) {
  ctx.logger.info('cron');
};
