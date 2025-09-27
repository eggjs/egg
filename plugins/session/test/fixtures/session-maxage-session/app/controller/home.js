exports.get = async function (ctx) {
  ctx.body = ctx.session;
};

exports.set = async function (ctx) {
  ctx.session = ctx.query;
  ctx.body = ctx.session;
};

exports.setKey = async function (ctx) {
  ctx.session.key = ctx.query.key;
  ctx.body = ctx.session;
};

exports.remove = async function (ctx) {
  ctx.session = null;
  ctx.body = ctx.session;
};

exports.maxAge = async function (ctx) {
  ctx.session.maxAge = ctx.query.maxAge;
  ctx.body = ctx.session;
};
