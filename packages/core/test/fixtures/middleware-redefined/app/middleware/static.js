'use strict';

module.exports = function () {
  return function* (next) {
    if (this.path === '/static') {
      this.body = 'static';
      return;
    }
    yield next;
  };
};
