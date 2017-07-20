'use strict';

exports.httpclient = {
  // agent timeout
  timeout: '3s',
  freeSocketKeepAliveTimeout: '2s',
  maxSockets: 100,
  maxFreeSockets: 100,
  keepAlive: false,

  request: {
    timeout: '10s',
  },
};
