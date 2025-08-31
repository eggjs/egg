'use strict';

module.exports = function (app) {
  class CtxService extends app.Service {
    get() {
      return this.ctx;
    }
  }

  return CtxService;
};
