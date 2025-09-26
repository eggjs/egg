'use strict';

exports.schedule = {
  type: 'worker',
  cron: '*/2 * * * * *',
  cronOptions: {
    endDate: Date.now() + 4500,
  },
};

exports.task = async function (ctx) {
  ctx.logger.info('cron-options');
};
