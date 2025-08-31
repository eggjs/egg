export default {
  get Proxy() {
    return this.BaseContextClass;
  },
  get [Symbol.for('view')]() {
    return 'egg';
  },
};
