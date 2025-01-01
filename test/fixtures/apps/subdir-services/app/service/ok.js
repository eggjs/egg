module.exports = app => {
  return class OK extends app.Service {
    constructor(ctx) {
      super(ctx);
    }

    async get() {
      return {
        ok: true,
      };
    }
  };
};
