'use strict';

module.exports = class Four {
  constructor(ctx) {
    this.ctx = ctx;
  }

  get() {
    return this.ctx.name + ':four';
  }
};
