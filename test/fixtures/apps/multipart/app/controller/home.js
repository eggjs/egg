'use strict';

module.exports = function* () {
  this.set('x-csrf', this.csrf);
  this.body = 'hi';
  // yield this.render('home.html');
};
