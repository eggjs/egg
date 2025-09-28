'use strict';

module.exports = async ctx => {
  ctx.body = {
    body: ctx.request.body,
    files: ctx.request.files,
  };

  if (ctx.query.cleanup === 'true') {
    await ctx.cleanupRequestFiles();
  }
  if (ctx.query.async_cleanup === 'true') {
    ctx.cleanupRequestFiles();
  }

  if (ctx.query.call_multipart_twice) {
    ctx.multipart();
  }
};
