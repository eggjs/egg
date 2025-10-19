'use strict';

const { Controller } = require('egg');

module.exports = class EggController1 extends Controller {
  async hello() {
    this.ctx.body = 'hello,egg';
  }
};
