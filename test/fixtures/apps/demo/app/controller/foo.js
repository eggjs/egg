'use strict';

module.exports = app => {
  return class Foo extends app.Controller {
    async bar() {
      this.ctx.body = 'this is bar!';
    }
  };
};
