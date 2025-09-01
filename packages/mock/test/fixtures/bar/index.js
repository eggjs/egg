const egg = require('egg');

const EGG_PATH = Symbol.for('egg#eggPath');

class BarApplication extends egg.Application {
  get [EGG_PATH]() {
    return __dirname;
  }
}

exports.Agent = egg.Agent;
exports.Application = BarApplication;
exports.startCluster = egg.startCluster;
