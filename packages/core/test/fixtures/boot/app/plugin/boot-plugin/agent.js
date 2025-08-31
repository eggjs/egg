const { scheduler } = require('node:timers/promises');

module.exports = agent => {
  agent.bootLog.push('agent.js in plugin');
  agent.beforeStart(async () => {
    await scheduler.wait(5);
    agent.bootLog.push('beforeStart');
  });

  agent.ready(() => {
    agent.bootLog.push('ready');
  });
};
