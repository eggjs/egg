'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'csp',
  csp: {
    enable: true,
    policy: {
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", '.domain.com', 'www.google-analytics.com'],
      'style-src': ["'unsafe-inline'", '.domain.com'],
      'img-src': ["'self'", 'data:', '.domain.com', 'www.google-analytics.com'],
      'frame-ancestors': ["'self'"],
      'report-uri': 'http://pointman.domain.com/csp?app=csp',
    },
  },
};
