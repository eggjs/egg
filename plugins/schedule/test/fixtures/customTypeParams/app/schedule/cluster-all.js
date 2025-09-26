'use strict';

exports.schedule = {
  type: 'cluster-all',
  interval: 4000,
};

exports.task = async function (ctx, data) {
  ctx.logger.info('cluster_all_log', data);
};
