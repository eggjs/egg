'use strict';

module.exports = function() {
  const exports = {};

  const now = new Date();
  const start = (now.getSeconds() + 3) % 60;
  exports.schedule = {
    cron: `${start}/30 * * * * *`,
    type: 'all',
  };

  exports.task = function* (ctx) {
    ctx.logger.info('all&&cron');
  };
  return exports;
};
