exports.index = async ctx => {
  ctx.logger.info('enableFastContextLogger: %s', ctx.app.config.logger.enableFastContextLogger);
  ctx.body = {
    enableFastContextLogger: ctx.app.config.logger.enableFastContextLogger,
  };
};
