'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'csp',
  match: /\/match/,
  csp: {
    match: /\/(?:mymatch|myignore)/,
    enable: true,
  },
};
