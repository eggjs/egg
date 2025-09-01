module.exports = class AppHook {

  async didLoad() {
    throw new Error('mock app ready failed');
  }
};
