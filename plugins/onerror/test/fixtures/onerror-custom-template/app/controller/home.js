exports.index = async ctx => {
  const err = new Error('test error');
  if (ctx.query.code) {
    err.code = ctx.query.code;
  }
  if (ctx.query.status) {
    err.status = Number(ctx.query.status);
  }
  if (ctx.query.message) {
    err.message = ctx.query.message;
  }
  throw err;
};

exports.csrf = async ctx => {
  ctx.set('x-csrf', ctx.csrf);
  ctx.body = 'test';
};

exports.test = async ctx => {
  const err = new SyntaxError('syntax error');
  if (ctx.query.status) {
    err.status = Number(ctx.query.status);
  }
  throw err;
};

exports.jsonp = async () => {
  throw new Error('jsonp error');
};
