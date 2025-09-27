'use strict';

exports.keys = 'test key';

exports.view = {
  defaultViewEngine: 'nunjucks',
  mapping: {
    '.nj': 'nunjucks',
  },
};

exports.security = {
  defaultMiddleware: 'csp',
  csp: {
    enable: true,
    policy: {
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'www.google-analytics.com'],
      'style-src': ["'unsafe-inline'", 'www.google-analytics.com'],
      'img-src': ["'self'", 'data:', 'www.google-analytics.com'],
      'frame-ancestors': ["'self'"],
      'report-uri': 'http://pointman.domain.com/csp?app=csp',
    },
  },
};
