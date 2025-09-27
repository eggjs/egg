'use strict';

exports.keys = 'test key';

exports.security = {
  csrf: {
    supportedRequests: [
      { path: /^\/api\/foo/, methods: ['PUT'] },
      { path: /^\/api\//, methods: ['POST', 'PUT'] },
    ],
  },
};
