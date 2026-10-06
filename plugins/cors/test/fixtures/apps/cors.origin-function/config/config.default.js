exports.keys = 'foo';

exports.cors = {
  async origin(ctx) {
    if (!ctx.get('origin')) return '';
    return 'http://eggjs.org';
  },
  credentials: true,
};

exports.security = {
  domainWhiteList: ['eggjs-white.org'],
};

exports.logger = {
  consoleLevel: 'NONE',
  level: 'NONE',
  coreLogger: {
    consoleLevel: 'NONE',
    level: 'NONE',
  },
  disableConsoleAfterReady: true,
};
