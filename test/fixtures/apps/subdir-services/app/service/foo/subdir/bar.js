'use strict';

module.exports = function (app) {
  class Bar2 extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * get(name) {
      return {
        name: name,
        bar: 'bar2',
      };
    }
  }

  return Bar2;
};
