'use strict';

exports.keys = '123123';

exports.security = {
  csrf: {
    cookieName: 'ctoken',
    cookieDomain(ctx) {
      return '.' + ctx.hostname.split('.').slice(1).join('.');
    },
  },
};
