'use strict';

exports.security = {
  ssrf: {
    ipBlackList: ['10.0.0.0/8', '127.0.0.1', '0.0.0.0/32'],
    ipExceptionList: ['10.1.1.1'],
  },
};
