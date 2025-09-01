/* eslint-disable @typescript-eslint/no-var-requires */
const egg = require('egg');

exports.startCluster = require('../../..').startCluster;
exports.Application = egg.Application;
exports.Agent = egg.Agent;
