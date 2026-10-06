const { scheduler } = require('node:timers/promises');

module.exports = (agent) => {
  agent.beforeClose(async () => {
    console.log('agent closing');
    await scheduler.wait(10);
    if (process.env.WORKER_CLOSE_FAIL === 'agent') throw new Error('agent cleanup failed');
    console.log('agent closed');
  });
};
