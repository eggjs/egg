module.exports = function (app) {
  class User extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    async get(uid) {
      return {
        uid: uid
      };
    }
  }

  return User;
};
