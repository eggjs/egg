exports.get = async function (ctx) {
  ctx.body = ctx.session;
};

exports.set = async function (ctx) {
  ctx.session = ctx.query;
  ctx.body = ctx.session;
};
