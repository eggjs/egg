'use strict';

module.exports = app => {
  return class Sub2 extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    async get(name) {
      return {
        name: name,
        bar: 'bar3',
      };
    }
  };
};
