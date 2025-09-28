'use strict';

module.exports = app => {
  app.post('/upload-limit-1mb', async ctx => {
    await ctx.saveRequestFiles({ limits: { fileSize: '1mb' } });
    ctx.body = {
      body: ctx.request.body,
      files: ctx.request.files,
    };
  });

  app.post('/upload-limit-2mb', async ctx => {
    await ctx.saveRequestFiles({ limits: { fileSize: '2mb' } });
    ctx.body = {
      body: ctx.request.body,
      files: ctx.request.files,
    };
  });
};
