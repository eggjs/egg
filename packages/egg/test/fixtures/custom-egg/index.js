'use strict';

module.exports = require('../../../index');
module.exports.Application = class Application extends module.exports.Application {
  constructor(...args) {
    super(...args);
    this.customEgg = true;
  }

  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
};
