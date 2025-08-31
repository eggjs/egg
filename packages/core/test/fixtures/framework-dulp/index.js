'use strict';

const EggApplication = require('../egg').Application;

class Application extends EggApplication {
  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
}

class Application2 extends Application {
  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
}

module.exports = Application2;
