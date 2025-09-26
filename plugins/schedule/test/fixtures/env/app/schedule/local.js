'use strict';

exports.schedule = {
  type: 'worker',
  interval: 4000,
  env: ['local'],
};

exports.task = async function (ctx) {
  ctx.logger.info('env local', ctx.app.config.env);
};
