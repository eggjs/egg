'use strict';

module.exports = function* home() {
  if (!this.isAuthenticated()) {
    return this.redirect('/auth/weibo');
  }

  this.body = '<h2>You are authenticated, user info: </h2><br><pre>' +
    JSON.stringify(this.passport.user, null, 2) + '</pre>';
};
