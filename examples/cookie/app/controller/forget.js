'use strict';

module.exports = function* () {
  this.deleteCookie('remember');
  this.redirect('/');
};
