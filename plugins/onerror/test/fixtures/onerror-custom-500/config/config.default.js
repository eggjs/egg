exports.onerror = {
  errorPageUrl: (_, ctx) => ctx.errorPageUrl || '/500',
};

exports.keys = 'foo,bar';

exports.logger = {
  level: 'NONE',
  consoleLevel: 'NONE',
};
