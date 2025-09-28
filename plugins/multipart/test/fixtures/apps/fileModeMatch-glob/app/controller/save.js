'use strict';

module.exports = async ctx => {
  await ctx.saveRequestFiles();
  ctx.body = {
    body: ctx.request.body,
    files: ctx.request.files,
  };
};
