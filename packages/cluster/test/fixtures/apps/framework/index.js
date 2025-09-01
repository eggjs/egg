const { startCluster } = require('egg');

exports.startCluster = startCluster;
exports.Application = require('./lib/framework');
exports.Agent = require('./lib/agent');
