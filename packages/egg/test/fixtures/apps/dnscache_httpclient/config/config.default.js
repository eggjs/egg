'use strict';

const os = require('os');
const path = require('path');

// Use unique log directory per vitest worker to avoid Windows file locking issues
const workerId = process.env.VITEST_WORKER_ID || '0';
const tempBase = path.join(os.tmpdir(), `egg-httpclient-test-${workerId}`);

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
};

exports.logger = {
  dir: path.join(tempBase, 'logs', 'dnscache_httpclient'),
};

exports.rundir = path.join(tempBase, 'run');

exports.keys = 'test key';
