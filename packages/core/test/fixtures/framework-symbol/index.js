'use strict';

const Application = require('framework2');

class Framework extends Application {
  constructor(options) {
    super(options);
  }

  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
}

module.exports = Framework;
