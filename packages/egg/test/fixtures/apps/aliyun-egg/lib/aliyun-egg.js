'use strict';

const path = require('path');
const egg = require('../../../../..');
const Application = egg.Application;
const AppWorkerLoader = egg.AppWorkerLoader;

class Loader extends AppWorkerLoader {

  constructor(options) {
    super(options);
  }

  loadConfig() {
    this.loadServerConf();
    super.loadConfig();
  }

  loadServerConf() {}
}

class ChairApplication extends Application {

  constructor(options) {
    super(options);
  }

  get [Symbol.for('egg#eggPath')]() {
    return path.join(__dirname, '..');
  }

  get [Symbol.for('egg#loader')]() {
    return Loader;
  }
}

module.exports = ChairApplication;
