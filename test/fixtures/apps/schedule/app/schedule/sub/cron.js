exports.schedule = {
  type: 'worker',
  cron: '*/5 * * * * *',
};

exports.task = async (ctx) => {
  ctx.logger.warn('cron wow');
};
