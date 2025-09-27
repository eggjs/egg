'use strict';

exports.keys = 'test key';

exports.helper = {
  shtml: {
    whiteList: {
      a: ['title', 'src'],
      img: ['src'],
      h2: ['style'],
    },
    domainWhiteList: ['.shaoshuai.me'],
  },
};
exports.security = {
  domainWhiteList: ['.domain.com'],
};
