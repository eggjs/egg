'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    ignore: ['/hello', '/world/:id'],
  },
};
