module.exports = {
  mockDevice(obj) {
    obj.mock = true;
    return obj;
  },

  async mockGenerator(obj) {
    obj.mock = true;
    return obj;
  },

  mockPromise(obj) {
    obj.mock = true;
    return Promise.resolve(obj);
  },
};
