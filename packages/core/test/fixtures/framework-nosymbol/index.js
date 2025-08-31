'use strict';

const EggApplication = require('../egg').Application;

class Application extends EggApplication {
  get a() {}
}

class Application2 extends Application {
  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
}

module.exports = Application2;
