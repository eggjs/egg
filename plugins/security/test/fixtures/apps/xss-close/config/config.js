'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xssProtection',
  xssProtection: {
    value: '0',
  },
};
