'use strict';

module.exports = function* home() {
  if (!this.isAuthenticated()) {
    return this.redirect('/auth/twitter');
  }

  console.log(this.session);
  this.body = 'You are authenticated ...';
};
