'use strict';

exports.keys = 'foo';

exports.security = {
  csrf: {
    ignore: /^\/api\//,
  },
  ctoken: {
    ignore: /^\/api\//,
  }
};
