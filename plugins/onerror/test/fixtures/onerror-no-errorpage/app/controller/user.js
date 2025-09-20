module.exports = async ctx => {
  const err = new Error('test error');
  if (ctx.query.status) {
    err.status = Number(ctx.query.status);
  }
  if (ctx.query.errors) {
    err.errors = ctx.query.errors;
  }
  throw err;
};
