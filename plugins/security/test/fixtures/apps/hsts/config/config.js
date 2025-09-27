'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'hsts',
  hsts: {
    enable: true,
    includeSubdomains: true,
  },
};
