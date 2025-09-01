const { scheduler } = require('node:timers/promises');

module.exports = agent => {
  agent.beforeClose(async () => {
    console.log('agent closing');
    await scheduler.wait(10);
    console.log('agent closed');
  });
};
