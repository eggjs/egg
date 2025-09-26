'use strict';

exports.schedule = {
  type: 'worker',
  cron: 'invalid instruction',
};

exports.task = async function (ctx) {
  ctx.logger.info('cron');
};
