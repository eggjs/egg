'use strict';

module.exports = class {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    const ctx = this.app.createAnonymousContext();
    this.app.beforeLoad = await ctx.repository.user.beforeLoad();
  }
};
