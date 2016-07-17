'use strict';

module.exports = function (app) {
  class Certify extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * exec(cmd) {
      return {
        cmd: cmd,
        method: this.ctx.method,
        url: this.ctx.url,
      };
    }
  }

  return Certify;
};
