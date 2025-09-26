exports.schedule = {
  type: 'worker',
  interval: '4s',
};

exports.task = async function (ctx) {
  ctx.logger.info('interval');
};
