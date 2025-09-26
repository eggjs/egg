'use strict';

exports.schedule = {
  type: 'cluster',
  interval: 3000,
};

exports.task = async function (ctx) {
  ctx.logger.info('cluster_log');
};
