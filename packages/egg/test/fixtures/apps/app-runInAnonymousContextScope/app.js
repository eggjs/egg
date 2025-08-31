module.exports = class Boot {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {
    await this.app.runInAnonymousContextScope(async ctx => {
      ctx.logger.info('inside before close on ctx logger');
      this.app.logger.info('inside before close on app logger');
    });
    this.app.logger.info('outside before close on app logger');
  }
}
