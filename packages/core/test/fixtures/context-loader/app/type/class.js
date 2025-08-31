'use strict';

module.exports = class Service {
  constructor(ctx) {
    this.ctx = ctx;
  }
  get() {
    return this.ctx.name;
  }
};
