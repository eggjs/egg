'use strict';

module.exports = function () {
  const config = {
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
  return config;
};
