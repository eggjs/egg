'use strict';

const os = require('os');
const path = require('path');

let rpcIdCounter = 0;

// Use unique log directory per vitest worker to avoid Windows file locking issues
const workerId = process.env.VITEST_WORKER_ID || '0';
const tempBase = path.join(os.tmpdir(), `egg-httpclient-test-${workerId}`);

exports.httpclient = {
  interceptors: [
    // Tracer interceptor: injects trace headers into every request
    (dispatch) => {
      return (opts, handler) => {
        opts.headers = opts.headers || {};
        opts.headers['x-trace-id'] = 'trace-123';
        rpcIdCounter++;
        opts.headers['x-rpc-id'] = `rpc-${rpcIdCounter}`;
        return dispatch(opts, handler);
      };
    },
  ],
};

exports.logger = {
  dir: path.join(tempBase, 'logs', 'httpclient-interceptor'),
};

exports.rundir = path.join(tempBase, 'run');

exports.keys = 'test key';
