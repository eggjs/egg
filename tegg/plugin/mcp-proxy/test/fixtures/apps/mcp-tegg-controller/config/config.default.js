'use strict';

module.exports = function () {
  return {
    keys: 'test key',
    security: {
      csrf: {
        enable: false,
      },
    },
    bodyParser: {
      enable: false,
    },
  };
};
