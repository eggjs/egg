'use strict';

module.exports = app => {
  return class AdminConfig extends app.Controller {
    async getName() {
      this.ctx.body = this.pathName;
    }

    async getFullPath() {
      this.ctx.body = this.fullPath;
    }
  };
};
