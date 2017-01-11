'use strict';

module.exports = function* () {
  this.cookies.set('remember', null);
  this.redirect('/');
};
