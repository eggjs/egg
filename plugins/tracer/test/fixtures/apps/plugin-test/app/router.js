const assert = require('assert');

module.exports = app => {
  app.get('/', async ctx => {
    assert(ctx.traceId);
    assert.equal(ctx.traceId, ctx.traceId);
    ctx.set('x-trace-id', ctx.traceId);
    ctx.body = 'hi, egg';
  });
};
