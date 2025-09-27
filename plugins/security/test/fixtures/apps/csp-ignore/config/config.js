exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'csp',
  csp: {
    enable: true,
    ignore: ['/api/', /^\/ignore\//],
    policy: {
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'www.google-analytics.com'],
      'style-src': ["'unsafe-inline'", 'www.google-analytics.com'],
      'img-src': ["'self'", 'data:', 'www.google-analytics.com'],
      'frame-ancestors': ["'self'"],
      'report-uri': 'http://pointman.domain.com/csp?app=csp',
    },
  },
};
