'use strict';

module.exports = async function() {
  this.state.foo = 'foo';
  this.locals.bar = 'bar';
  await this.render('locals.html');
};
