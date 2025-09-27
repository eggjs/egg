const sessions = {};

module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async willReady() {
    this.app.sessionStore = {
      async get(key) {
        return sessions[key];
      },

      async set(key, value) {
        sessions[key] = value;
      },

      async destroy(key) {
        sessions[key] = undefined;
      },
    };
  }
};
