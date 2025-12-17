'use strict';

module.exports = app => {
  return {
    async index(ctx) {
      if (ctx.get('x-traceid')) {
        ctx.traceId = ctx.get('x-traceid');
        ctx.tracer = {
          ...ctx.tracer,
          traceId: ctx.get('x-traceid'),
        };
      }
      const r = await app.fetch(ctx.query.url);
      const data = await r.json();
      app.logger.info('app logger support traceId');
      ctx.body = {
        url: ctx.query.url,
        data,
      };
    },
  };
};
