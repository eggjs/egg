'use strict';

module.exports = function*() {
  this.body = 'hello ' + this.user.name;
};
