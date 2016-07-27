'use strict';

exports.schedule = {
  interval: 3000,
  type: 'all',
};

exports.task = function* (ctx) {
  ctx.logger.info('all&&interval');
};
