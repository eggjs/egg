'use strict';

module.exports = function (app) {
  class Bar111 extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * get(name) {
      return {
        name: name,
        bar: 'bar111',
      };
    }
  }

  return Bar111;
};
