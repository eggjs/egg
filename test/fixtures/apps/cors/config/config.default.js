'use strict';

exports.keys = 'foo';

exports.cors = {
  credentials: true,
};

exports.security = {
  domainWhiteList: [
    'eggjs.org',
  ],
};
