exports.schedule = {
  type: 'worker',
  cron: '*/5 * * * * *',
};

exports.task = async function (ctx, ...args) {
  ctx.logger.info('cron', ...args);
};
