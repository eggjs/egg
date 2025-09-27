'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'csp',
  ignore: '/ignore',
  csp: {
    enable: true,
  },
};
