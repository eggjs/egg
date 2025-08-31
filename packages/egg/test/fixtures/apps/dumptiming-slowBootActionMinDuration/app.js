module.exports = class {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    this.app.coreLogger.info('start doing sth in didLoad');
    return new Promise(resolve => {
      setTimeout(() => {
        this.app.coreLogger.info('end doing sth in didLoad');
        resolve();
      }, 150);
    });
  }
}
