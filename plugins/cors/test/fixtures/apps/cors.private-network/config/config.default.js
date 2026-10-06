'use strict';

exports.keys = 'foo';

exports.cors = {
  privateNetworkAccess: true,
};

exports.security = {
  csrf: false,
  domainWhiteList: ['.eggjs.org'],
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
