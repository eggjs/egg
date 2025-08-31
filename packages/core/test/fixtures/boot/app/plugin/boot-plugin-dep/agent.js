'use strict';

module.exports = class Boot {
  constructor(agent) {
    this.agent = agent;
  }
  configDidLoad() {
    this.agent.bootLog.push('configDidLoad in plugin');
  }
};
