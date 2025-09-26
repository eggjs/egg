exports.schedule = {
  type: 'worker',
  interval: '4s',
};

exports.task = async ctx => {
  ctx.app.logger.info('interval');
};
