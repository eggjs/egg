'use strict';

let rpcIdCounter = 0;

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

exports.keys = 'test key';
