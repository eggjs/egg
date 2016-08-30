/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = () => {
  return function* meta(next) {
    yield next;
    // total response time header
    this.set('X-Readtime', Date.now() - this.starttime);
  };
};
