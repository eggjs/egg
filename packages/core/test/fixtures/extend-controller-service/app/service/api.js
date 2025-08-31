module.exports = app => {
  return class ApiService extends app.Service {
    async get() {
      return await this.getData();
    }
  };
};
