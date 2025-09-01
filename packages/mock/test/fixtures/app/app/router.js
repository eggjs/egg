const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.get('/', async ctx => {
    ctx.body = 'foo';
  });

  app.get('/keepAliveTimeout', async ctx => {
    ctx.body = {
      keepAliveTimeout: ctx.app.serverKeepAliveTimeout,
    };
  });

  app.get('/ua', async ctx => {
    ctx.body = ctx.get('user-agent');
  });

  app.get('/logger', async ctx => {
    ctx.logger.info('[app.expectLog() test] ok');
    ctx.coreLogger.info('[app.expectLog(coreLogger) test] ok');
    ctx.body = { ok: true };
  });


  let counter = 0;
  app.get('/counter', async ctx => {
    ctx.body = { counter };
  });

  app.get('/counter/plus', async ctx => {
    ctx.runInBackground(async ctx => {
      // mock io delay
      await scheduler.wait(10);
      if (ctx.superMan) {
        counter += 10;
        return;
      }
      counter++;
    });
    ctx.body = { counter };
  });

  app.get('/counter/minus', async ctx => {
    ctx.runInBackground(async () => {
      await scheduler.wait(10);
      counter--;
    });
    ctx.body = { counter };
  });

  app.get('/counter/plusplus', async ctx => {
    ctx.runInBackground(async ctx => {
      // mock io delay
      await scheduler.wait(10);
      if (ctx.superMan) {
        counter += 10;
      } else {
        counter++;
      }
      ctx.runInBackground(async ctx => {
        // mock io delay
        await scheduler.wait(10);
        if (ctx.superMan) {
          counter += 10;
        } else {
          counter++;
        }
      });
    });
    ctx.body = { counter };
  });
};
