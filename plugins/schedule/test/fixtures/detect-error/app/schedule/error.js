'use strict';

exports.schedule = {
  type: 'worker',
  interval: 40000,
  immediate: true,
};

exports.task = async function (ctx) {
  ctx.logger.info('error');
  throw new Error('some err');
};
