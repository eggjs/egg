'use strict';

module.exports = function*() {
  this.setCookie('hi', 'foo');
  this.body = 'hello';
};
