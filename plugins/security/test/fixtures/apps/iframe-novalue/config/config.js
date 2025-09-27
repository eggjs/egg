'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    value: undefined,
    ignore: ['/hello', '/world/:id'],
  },
};
