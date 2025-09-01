const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.beforeClose(async () => {
    console.log('app closing');
    await scheduler.wait(10);
    console.log('app closed');
  });
};
