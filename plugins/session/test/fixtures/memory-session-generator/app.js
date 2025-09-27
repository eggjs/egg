const sessions = {};

module.exports = app => {
  app.sessionStore = {
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
};
