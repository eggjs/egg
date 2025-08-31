'use strict';

const EggApplication = require('../egg').Application;

class Application extends EggApplication {
  [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
}

module.exports = Application;
