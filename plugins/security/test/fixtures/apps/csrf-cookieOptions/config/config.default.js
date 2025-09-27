'use strict';

exports.keys = 'cookie options';

exports.security = {
  csrf: {
    cookieOptions: {
      httpOnly: true,
    },
  },
};
