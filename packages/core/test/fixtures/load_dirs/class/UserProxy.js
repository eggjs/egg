'use strict';

class UserProxy {
  constructor() {
    this.user = {
      name: 'xiaochen.gaoxc',
    };
  }

  getUser() {
    return this.user;
  }
}

module.exports = UserProxy;
