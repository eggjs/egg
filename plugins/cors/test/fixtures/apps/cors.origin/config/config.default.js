exports.keys = 'foo';

exports.cors = {
  origin: 'http://eggjs.org',
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
