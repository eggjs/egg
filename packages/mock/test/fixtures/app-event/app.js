const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.ready(() => {
    // after ready
    console.log('emit appReady event in app.js');
    app.emit('appReady');
  });
  console.log('register ready event in app.js');

  process.nextTick(() => {
    // before ready, after app instantiate
    app.emit('appInstantiated');
  });

  app.beforeStart(async function() {
    await scheduler.wait(1000);
  });
};
