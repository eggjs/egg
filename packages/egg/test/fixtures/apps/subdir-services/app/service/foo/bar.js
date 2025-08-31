module.exports = function (app) {
  class Bar extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    async get(name) {
      return {
        name: name,
        bar: 'bar1',
      };
    }
  }

  return Bar;
};
