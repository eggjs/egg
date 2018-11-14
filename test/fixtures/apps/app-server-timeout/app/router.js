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
};
