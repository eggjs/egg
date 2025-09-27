module.exports = app => {
  // set redis session store
  app.sessionStore = class Store {
    constructor(app) {
      this.app = app;
    }
    async get(key) {
      const res = await this.app.redis.get(key);
      if (!res) return null;
      return JSON.parse(res);
    }

    async set(key, value, maxAge) {
      value = JSON.stringify(value);
      await this.app.redis.set(key, value, 'PX', maxAge);
    }

    async destroy(key) {
      await this.app.redis.del(key);
    }
  };
};
