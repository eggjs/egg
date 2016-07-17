'use strict';

module.exports = function (app) {
  class UserCif extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    * get(uid) {
      return {
        uid: uid,
        cif: true,
      };
    }
  }

  return UserCif;
};
