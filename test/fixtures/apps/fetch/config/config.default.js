'use strict';

exports.keys = 'test key';

exports.security = {
  ssrf: {
    checkAddress(ip, family, host) {
      // Allow local addresses for testing by default
      // Tests can mock this function to test blocking behavior
      return true;
    },
  },
};
