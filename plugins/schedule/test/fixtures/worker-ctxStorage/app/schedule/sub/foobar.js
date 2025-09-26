exports.schedule = {
  type: 'worker',
  cron: '*/5 * * * * *',
};

exports.task = async (ctx, ...args) => {
  ctx.app.logger.info('foobar', ...args);
};
