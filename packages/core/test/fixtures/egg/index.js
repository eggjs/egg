const { EggLoader, EggCore } = require('../../..');

class AppLoader extends EggLoader {
  async loadAll() {
    await this.loadPlugin();
    await this.loadConfig();
    await this.loadApplicationExtend();
    await this.loadContextExtend();
    await this.loadRequestExtend();
    await this.loadResponseExtend();
    await this.loadCustomApp();
    await this.loadMiddleware();
    await this.loadService();
    await this.loadController();
    await this.loadRouter();
  }
}

class Application extends EggCore {
  constructor(options = {}) {
    super(options);
    this.on('error', err => {
      console.error(err);
    });
  }

  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
  get [Symbol.for('egg#loader')]() {
    return AppLoader;
  }
}

exports.Application = Application;
