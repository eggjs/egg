const assert = require('assert');

module.exports = app => {
  return async function file(ctx) {
    const ctxFromStorage = app.ctxStorage.getStore();
    assert(ctxFromStorage !== ctx);
    const stream = await ctx.getFileStream();
    const fields = stream.fields;
    ctx.body = {
      fields,
      filename: stream.filename,
      user: ctx.user,
      traceId: ctx.traceId,
      ctxFromStorageUser: ctxFromStorage.user,
      ctxFromStorageTraceId: ctxFromStorage.traceId,
    };
  };
};
