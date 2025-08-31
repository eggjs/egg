'use strict';

module.exports = app => {
  return class AsyncController extends app.Controller {
    async index() {
      this.ctx.body.push('async');
    }
  };
};
