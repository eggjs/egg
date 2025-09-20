exports.onerror = {
  errorPageUrl: 'https://eggjs.com/500.html',
  json(err, ctx) {
    ctx.body = { msg: 'error' };
    ctx.status = 500;
  },
};

exports.logger = {
  level: 'NONE',
  consoleLevel: 'NONE',
};

exports.keys = 'foo,bar';

exports.security = {
  csrf: false,
};
