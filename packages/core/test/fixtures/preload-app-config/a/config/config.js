'use strict';

module.exports = function (antx, appConfig) {
  appConfig.app.sub.val = 2;
  return {
    plugin: {
      sub: appConfig.app.sub,
      val: appConfig.app.val,
    },
  };
};
