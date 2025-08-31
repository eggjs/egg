exports.status = {
  match(ctx) {
    return ctx.method === 'GET';
  },
};
