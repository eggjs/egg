'use strict';

module.exports = {
  async callFunction(...args) {
    this.body = 'done';
    return args;
  },
};
