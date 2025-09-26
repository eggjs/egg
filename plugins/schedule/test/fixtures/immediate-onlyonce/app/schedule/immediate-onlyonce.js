'use strict';

exports.schedule = {
  type: 'worker',
  immediate: true,
};

exports.task = async function (ctx) {
  ctx.logger.info('immediate-onlyonce');
};
