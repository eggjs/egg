exports.get = async ctx => {
  ctx.body = ctx.session;
};

exports.set = async ctx => {
  ctx.session = ctx.query;
  ctx.body = ctx.session;
};
