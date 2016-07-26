'use strict';

exports.schedule = {
  interval: 3000,
  type: 'worker',
};

exports.task = function* (ctx) {
  ctx.logger.info('worker&&interval');
};
