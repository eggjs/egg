'use strict';

module.exports = function* () {
  this.session.count = (this.session.count || 0) + 1;
  this.body = `${this.session.count} times, now: ${Date()}`;
};
