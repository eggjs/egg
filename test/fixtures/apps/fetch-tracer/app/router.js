module.exports = app => {
  app.get('/test', async ctx => {
    // Mock a tracer on the context using the Tracer class
    ctx.tracer = new app.Tracer('test-trace-id-123', '0');

    // Store the current context so fetch can access it
    app.currentContext = ctx;

    // Make a fetch request
    const response = await app.fetch(ctx.query.url);

    const traceId = response.headers.get('x-trace-id');
    if (traceId) ctx.set('x-trace-id', traceId);
    const rpcId = response.headers.get('x-rpc-id');
    if (rpcId) ctx.set('x-rpc-id', rpcId);

    ctx.body = {
      status: response.status,
      ok: response.ok,
    };
  });
};
