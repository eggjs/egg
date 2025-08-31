'use strict';

class BaseController {
  constructor(ctx) {
    this.ctx = ctx;
  }

  callInheritedFunction() {
    this.ctx.body = 'inherited';
  }

  callOverriddenFunction() {
    this.ctx.body = 'base';
  }
}

module.exports = class HomeController extends BaseController {
  callOverriddenFunction() {
    this.ctx.body = 'own';
  }
};
