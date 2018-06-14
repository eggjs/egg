'use strict';

module.exports = app => {
  return class Home extends app.Controller {
    * index() {
      const { ctx } = this;
      ctx.body = 'hello world';
    }
  };
};
