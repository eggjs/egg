'use strict';

const cluster = require('cluster');

module.exports = function(app) {
  app.messenger.on('egg-ready', () => {
    console.log('app receive egg-ready, worker %s', cluster.worker.id);
  });
};
