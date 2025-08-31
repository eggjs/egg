'use strict';

module.exports = class Three {
  constructor(ctx) {
    this.ctx = ctx;
  }

  get() {
    return this.ctx.name + ':three';
  }
};
