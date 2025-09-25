const egg = require('egg');

class Application extends egg.Application {
  constructor() {
    throw new Error('start error');
  }
}

exports.Application = Application;
exports.Agent = egg.Agent;
exports.startCluster = egg.startCluster;
