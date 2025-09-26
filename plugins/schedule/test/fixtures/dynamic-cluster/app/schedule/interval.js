'use strict';

module.exports = function (app) {
  exports.schedule = {
    type: 'worker',
    interval: 4000,
    disable: app.config.disable,
  };

  exports.task = async function (ctx) {
    ctx.logger.info('interval');
  };

  return exports;
};
