'use strict';

exports.schedule = {
  type: 'worker',
  interval: 4000,
};

exports.task = async function (ctx) {
  ctx.logger.info('env undefined');
};
