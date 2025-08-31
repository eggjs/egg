'use strict';

module.exports = class One {
  constructor(ctx) {
    this.ctx = ctx;
  }

  get() {
    return this.ctx.name + ':one';
  }
};
