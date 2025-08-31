module.exports = class Boot {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {

    const request = {
      headers: {
        host: '127.0.0.2',
        'x-forwarded-for': '127.0.0.2',
      },
      querystring: 'Testing',
      host: '127.0.0.2',
      hostname: '127.0.0.2',
      protocol: 'http',
      secure: 'false',
      method: 'GET',
      url: '/',
      path: '/',
      socket: {
        remoteAddress: '127.0.0.2',
        remotePort: 7001,
      },
    };

    await this.app.runInAnonymousContextScope(async ctx => {
      ctx.logger.info('inside before close on ctx logger');
      this.app.logger.info('inside before close on app logger');
    }, request);
    this.app.logger.info('outside before close on app logger');
  }
}
