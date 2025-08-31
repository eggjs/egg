'use strict';

module.exports = app => {
  return class Resource extends app.Controller {
    async index(ctx) {
      ctx.body = 'index';
    }

    async create(ctx) {
      ctx.body = 'create';
    }
  };
};
