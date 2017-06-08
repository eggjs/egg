'use strict';

module.exports = app => {
  return class Foo extends app.Controller {
    * call() {
      this.depd(1);
      this.depd(2);
      this.depd(3);
      this.ctx.body = 'done';
    }

    depd(count) {
      this.app.deprecate(`depd ${count}`);
    }
  };
};
