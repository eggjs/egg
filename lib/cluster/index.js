/**
 * cluster start, start flow:
 *
 * [startCluster] -> master -> agent_worker -> new [Agent]       -> agentWorkerLoader
 *                         `-> app_worker   -> new [Application] -> appWorkerLoader
 */

'use strict';

const path = require('path');
const startCluster = require('egg-cluster').startCluster;

/**
 * cluster start egg app
 * @method Egg#startCluster
 * @param {Object} options - see {@link https://github.com/egg/egg-cluster}
 * @param {Function} callback - start success callback
 */
exports.startCluster = function(options, callback) {
  options = options || {};
  options.eggPath = path.join(__dirname, '../..');
  startCluster(options, callback);
};
