'use strict';

exports.helpers = {
  shtml: {
    domainWhiteList: ['.shaoshuai.me'],
    whiteList: {
      a: [/*'target'*/, 'href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    }
  },
};

exports.keys = 'test key';
