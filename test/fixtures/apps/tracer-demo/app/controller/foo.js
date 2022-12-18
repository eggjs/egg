module.exports = app => {
  return {
    async index(ctx) {
      if (ctx.get('x-traceid')) {
        ctx.traceId = ctx.get('x-traceid');
        ctx.tracer = {
          ...ctx.tracder,
          traceId:  ctx.get('x-traceid'),
        };
      }
      const r = await app.curl(ctx.query.url, {
        dataType: 'json',
      });
      app.logger.info('app logger support traceId');
      ctx.body = {
        url: ctx.query.url,
        data: r.data,
      };
    },
  };
};
