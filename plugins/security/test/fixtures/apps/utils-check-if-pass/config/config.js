'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'csp',
  match: /\/(?:match|ignore)/,
  csp: {
    enable: true,
  },
};
