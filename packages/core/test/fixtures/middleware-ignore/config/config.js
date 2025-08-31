exports.status = {
  ignore(ctx) {
    return ctx.method === 'GET';
  },
};
