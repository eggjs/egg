'use strict';

exports.schedule = {
  type: 'worker',
  interval: 4000,
  env: ['unittest'],
};

exports.task = async function (ctx) {
  ctx.logger.info('env unittest');
};
