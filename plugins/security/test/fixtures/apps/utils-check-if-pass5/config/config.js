'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    ignore: ['/ignore1', '/ignore2'],
    enable: true,
  },
};
