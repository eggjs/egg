module.exports = {
  get Proxy() {
    return this.BaseContextClass;
  },
  get [Symbol.for('view')]() {
    return 'egg';
  },
};
