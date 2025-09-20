exports.onerror = {
  errorPageUrl: 'https://eggjs.com/500.html',
  appErrorFilter(err, ctx) {
    if (err.name === 'IgnoreError') return false;
    if (err.name === 'CustomError') {
      ctx.app.logger.error('error happened');
      return false;
    }
    return true;
  },
};

exports.keys = 'foo,bar';

exports.logger = {
  level: 'NONE',
  consoleLevel: 'NONE',
};
