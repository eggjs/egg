module.exports = app => {
  return {
    async index(ctx) {
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
