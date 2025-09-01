'use strict';

module.exports = function(app) {
  let count = 1;
  app.messenger.on('egg-pids', data => console.log('#%s app get %s workers', count++, data.length, data));
};
