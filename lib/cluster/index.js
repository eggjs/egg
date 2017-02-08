'use strict';

const path = require('path');
const startCluster = require('egg-cluster').startCluster;

module.exports = (options = {}, callback) => {
  /* istanbul ignore next */
  options.customEgg = options.customEgg || path.join(__dirname, '../..');
  startCluster(options, callback);
};
