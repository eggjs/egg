'use strict';

exports.keys = 'test key';

exports.security = {
  /**
   * disable methodnoallow
   */
  methodnoallow: {
    enable: false,
  },

  csrf: {
    supportedRequests: [
      { path: /^\/update/, methods: ['POST'] },
      { path: /^\/api\//, methods: ['GET'] },
      { path: /^\//, methods: ['PATCH', 'DELETE', 'PUT'] },
    ],
  },
};
