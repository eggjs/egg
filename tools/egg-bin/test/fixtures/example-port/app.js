module.exports = class Boot {
  async serverDidReady() {
    // Server is listening
    process.exit(0);
  }
};
