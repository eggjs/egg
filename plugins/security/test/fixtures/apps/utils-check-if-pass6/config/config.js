'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  xframe: {
    match: ['/match1', '/match2'],
    enable: true,
  },
};
