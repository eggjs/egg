'use strict';

module.exports = app => {
  return class Foo extends app.Controller {
    * bar() {
      this.ctx.body = 'this is bar!';
    }
  };
};
