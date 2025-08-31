'use strict';

module.exports = function (app) {
  class CouponQuery extends app.Proxy {
    constructor(ctx) {
      super(ctx);
    }

    *query() {
      return {
        coupon: 100,
      };
    }
  }

  return CouponQuery;
};
