'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    value: 'ALLOW-FROM http://www.domain.com',
    ignore: ['/hello', '/world/:id'],
  },
};
