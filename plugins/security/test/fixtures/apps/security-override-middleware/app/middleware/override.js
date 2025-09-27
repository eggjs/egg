module.exports = () => {
  return async (ctx, next) => {
    delete ctx.response.header['Strict-Transport-Security'];
    delete ctx.response.header['X-Download-Options'];
    delete ctx.response.header['X-Content-Type-Options'];
    delete ctx.response.header['X-XSS-Protection'];
    await next();
    delete ctx.response.header['Strict-Transport-Security'];
    delete ctx.response.header['X-Download-Options'];
    delete ctx.response.header['X-Content-Type-Options'];
    delete ctx.response.header['X-XSS-Protection'];
  };
};
