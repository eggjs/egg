'use strict';

module.exports = app => {
  return class ApiController extends app.Controller {
    async index() {
      const result = await this.service.api.getName();
      this.ctx.body.push(result);
      this.ctx.body.push('controller');
    }
  };
};
