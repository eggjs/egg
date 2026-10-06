const { scheduler } = require('node:timers/promises');

module.exports = (app) => {
  app.beforeClose(async () => {
    console.log('app closing');
    await scheduler.wait(10);
    if (process.env.WORKER_CLOSE_FAIL === 'app') throw new Error('app cleanup failed');
    console.log('app closed');
  });
};
