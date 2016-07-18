'use strict';

module.exports = function*() {
  this.state.foo = 'foo';
  this.locals.bar = 'bar';
  yield this.render('locals.html');
};
