'use strict';

module.exports = function*() {
  this.cookies.set('hi', 'foo');
  this.body = 'hello';
};
