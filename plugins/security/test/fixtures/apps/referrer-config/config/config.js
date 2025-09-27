'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'referrerPolicy',
  referrerPolicy: {
    value: 'origin',
    enable: true,
  },
};
