'use strict';

module.exports = function (app) {
  class Bar extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * get(name) {
      return {
        name: name,
        bar: 'bar1',
      };
    }
  }

  return Bar;
};
