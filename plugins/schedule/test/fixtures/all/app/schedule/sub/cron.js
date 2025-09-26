'use strict';

exports.schedule = {
  type: 'all',
  cron: '*/5 * * * * *',
};

exports.task = async function (ctx) {
  ctx.logger.info('cron');
};
