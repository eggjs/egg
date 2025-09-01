'use strict';

module.exports = function(app) {
  class Home extends app.Controller {
    async testService() {
      this.ctx.body = {
        foo1: await this.service.foo.get(),
        foo2: await this.service.bar.foo.get(),
        foo3: this.service.foo.getSync(),
        thirdService: await this.service.third.bar.foo.get(),
      };
    }
  }

  return Home;
};
