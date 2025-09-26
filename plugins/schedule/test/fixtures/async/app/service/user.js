'use strict';

const Service = require('egg').Service;

class UserService extends Service {
  async hello(name) {
    return `hello ${name}`;
  }
}

module.exports = UserService;
