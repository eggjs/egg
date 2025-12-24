'use strict';

exports.httpclient = {
  lookup: function (hostname, options, callback) {
    const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (IP_REGEX.test(hostname)) {
      const family = typeof options.family === 'number' ? options.family : 4;
      if (options.all) {
        callback(null, [{ address: hostname, family }]);
      } else {
        callback(null, hostname, family);
      }
    } else {
      const resultIp = '127.0.0.1';
      if (options.all) {
        callback(null, [{ address: resultIp, family: 4 }]);
      } else {
        callback(null, resultIp, 4);
      }
    }
  },
  request: {
    timeout: 2000,
  },
  httpAgent: {
    keepAlive: false,
  },
  httpsAgent: {
    keepAlive: false,
  },
};

exports.keys = 'test key';
