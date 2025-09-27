'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'hsts',
  hsts: {
    includeSubdomains: true,
  },
};
