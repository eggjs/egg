'use strict';

module.exports = app => {
  return class OK extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * get() {
      return {
        ok: true,
      };
    }
  };
};
