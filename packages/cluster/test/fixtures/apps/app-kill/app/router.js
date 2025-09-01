module.exports = app => {
  app.get('/kill', ctx => {
    const signal = ctx.query.signal && ctx.query.signal.toUpperCase();
    ctx.logger.info('kill by signal', signal, process.execArgv);
    process.kill(process.pid, signal);
  });
};
