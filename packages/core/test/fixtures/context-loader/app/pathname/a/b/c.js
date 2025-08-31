'use strict';

module.exports = app => {
  return class xxx extends app.BaseContextClass {
    async getPathname() {
      return this.pathName;
    }

    async getName() {
      return this.config.name;
    }
  };
};
