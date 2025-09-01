const path = require('path');
const egg = require('egg');
const Application = egg.Application;
const AppWorkerLoader = egg.AppWorkerLoader;

class Loader extends AppWorkerLoader {
  async loadConfig() {
    this.loadServerConf();
    await super.loadConfig();
  }

  loadServerConf() {}
}

class ChairApplication extends Application {
  get [Symbol.for('egg#eggPath')]() {
    return path.join(__dirname, '..');
  }

  get [Symbol.for('egg#loader')]() {
    return Loader;
  }
}

module.exports = ChairApplication;
