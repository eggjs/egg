'use strict';

module.exports = app => {
  return class Home extends app.Controller {
    async index() {
      const { ctx } = this;
      ctx.body = 'hello world';
    }
  };
};
