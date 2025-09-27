'use strict';

exports.keys = 'test key';

exports.security = {
  csrf: {
    enable: false,
  },
  domainWhiteList: ['.domain.com'],
};
