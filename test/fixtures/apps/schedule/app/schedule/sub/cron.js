'use strict';

exports.schedule = {
  type: 'worker',
  cron: '*/5 * * * * *',
};

exports.task = function*(ctx) {
  ctx.logger.info('cron');
};
