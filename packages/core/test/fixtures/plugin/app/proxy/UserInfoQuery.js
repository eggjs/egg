'use strict';

module.exports = function (app) {
  class UserInfoQuery extends app.Proxy {
    constructor(ctx) {
      super(ctx);
    }

    *query() {
      return {
        foo: 'bar',
      };
    }
  }

  return UserInfoQuery;
};
