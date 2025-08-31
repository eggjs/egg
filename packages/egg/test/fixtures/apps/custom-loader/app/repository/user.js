'use strict';

class UserRepository {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async get() {
    return this.ctx.params.name;
  }

  async beforeLoad() {
    return 'beforeLoad';
  }

}

module.exports = UserRepository;
