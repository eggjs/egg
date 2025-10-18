'use strict';

const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

Object.assign(exports, egg);

exports.Application = class Application extends egg.Application {
  get [EGG_PATH]() {
    return __dirname;
  }
};
exports.Agent = class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return __dirname;
  }
};
