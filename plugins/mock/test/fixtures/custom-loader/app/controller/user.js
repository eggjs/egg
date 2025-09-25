'use strict';

class UserController {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

  async get() {
    this.ctx.body = {
      adapter: await this.app.adapter.docker.inspectDocker(),
      repository: await this.ctx.repository.user.get(),
    };
  }
}

module.exports = UserController;
