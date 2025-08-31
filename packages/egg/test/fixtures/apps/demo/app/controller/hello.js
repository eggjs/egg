'use strict';

module.exports = async function() {
  this.cookies.set('hi', 'foo');
  this.body = 'hello';
};
