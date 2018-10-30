'use strict';

const { sleep } = require('mz-modules');

module.exports = app => {
  app.get('/', async ctx => {
    ctx.body = 'ok';
  });

  app.get('/timeout', async ctx => {
    await sleep(500);
    ctx.body = 'timeout';
  });

  app.get('/req_timeout', async ctx => {
    ctx.request.setTimeout(500)
    await sleep(ctx.query.ms);
    ctx.body = 'ok';
  });
};
