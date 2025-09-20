module.exports = () => {
  return async function(ctx, next) {
    await next();
    ctx.logger.info('log something, then error happend.');
    ctx.logger.info('%s', ctx.userId)
  };
};
