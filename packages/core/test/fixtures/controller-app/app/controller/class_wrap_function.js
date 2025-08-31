'use strict';

module.exports = app => {
  return class HomeController extends app.Controller {
    get() {
      this.ctx.body = 'done';
    }
  };
};
