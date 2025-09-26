'use strict';

exports.schedule = {
  type: 'worker',
  interval: 10000,
};

exports.task = async function (ctx) {
  ctx.logger.info('interval');
};
