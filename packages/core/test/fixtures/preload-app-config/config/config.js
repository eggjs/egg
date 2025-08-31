'use strict';

module.exports = function (antx, appConfig) {
  return {
    app: {
      sub: {
        val: 1,
      },
      val: 2,
    },
    appInApp: appConfig != null,
  };
};
