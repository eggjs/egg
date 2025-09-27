'use strict';

exports.security = {
  ssrf: {
    ipBlackList: ['10.0.0.0/8', '127.0.0.1', '0.0.0.0/32'],
    hostnameExceptionList: ['registry.npmjs.org', 'registry.npmmirror.com'],
  },
};
