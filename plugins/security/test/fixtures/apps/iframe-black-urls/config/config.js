'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    blackUrls: ['/hello', '/world/:id'],
  },
};
