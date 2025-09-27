exports.index = ctx => {
  ctx.body = {
    csrf: ctx.csrf,
    env: ctx.app.config.env,
    supportedRequestsMethods: ctx.app.config.security.csrf.supportedRequests[0].methods,
  };
};

exports.update = ctx => {
  ctx.session.body = ctx.request.body;
  ctx.body = ctx.request.body;
};
