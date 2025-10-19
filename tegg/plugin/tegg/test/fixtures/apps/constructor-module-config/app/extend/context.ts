export default {
  __COUNTER__: 0,
  get counter(): number {
    if (!this.__COUNTER__) {
      this.__COUNTER__ = 0;
    }
    return this.__COUNTER__++;
  },

  get user() {
    return {};
  },
};
