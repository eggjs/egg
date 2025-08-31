'use strict';

module.exports = class Two {
  constructor(ctx) {
    this.ctx = ctx;
  }

  get() {
    return this.ctx.name + ':two';
  }
};
