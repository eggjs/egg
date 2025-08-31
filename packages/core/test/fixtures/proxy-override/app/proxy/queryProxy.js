'use strict';

module.exports = function (app) {
  class QueryProxy extends app.Proxy {
    constructor(ctx) {
      super(ctx);
    }

    *query() {
      return {
        foo: 'bar',
      };
    }
  }

  return QueryProxy;
};
