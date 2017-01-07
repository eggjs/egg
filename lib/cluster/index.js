'use strict';

const path = require('path');
const utils = require('../core/util');
const startCluster = require('egg-cluster').startCluster;

module.exports = (options, callback) => {
  options = options || {};
  options.customEgg = options.customEgg || path.join(__dirname, '../..');
  utils.getFreePort((err, port) => {
    if (err) {
      callback(err);
      return;
    }
    options.clusterPort = port;
    startCluster(options, callback);
  });
};
