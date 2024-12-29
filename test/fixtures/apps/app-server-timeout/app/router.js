const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.get('/', async ctx => {
    ctx.body = 'ok';
  });

  app.get('/timeout', async ctx => {
    await scheduler.wait(500);
    ctx.body = 'timeout';
  });
};
