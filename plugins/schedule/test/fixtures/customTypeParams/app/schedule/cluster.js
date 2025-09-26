'use strict';

exports.schedule = {
  type: 'cluster',
  interval: 4000,
};

exports.task = async function (ctx, data) {
  ctx.logger.info('cluster_log', data);
};
