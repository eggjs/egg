module.exports = app => {
  return {
    async index() {
      const ctx = app.currentContext;
      const requestUrl = ctx.query.url;
      const { status, headers } = await app.httpclient.request(requestUrl);
      ctx.body = {
        requestUrl,
        status,
        headers,
        traceId: ctx.tracer.traceId,
      };
    },
  };
};
