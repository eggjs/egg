'use strict';

module.exports = function* () {
  const minute = 60000;
  if (this.request.body.remember) this.setCookie('remember', 1, { maxAge: minute });
  this.redirect('/');
};
