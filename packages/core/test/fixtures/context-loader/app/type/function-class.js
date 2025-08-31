'use strict';

module.exports = app =>
  class Service {
    constructor(ctx) {
      this.ctx = ctx;
    }
    get() {
      return this.ctx.name + ':' + app.config.name;
    }
  };
