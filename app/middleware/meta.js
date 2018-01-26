/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = options => {
  return function* meta(next) {
    if (options.logging) {
      this.coreLogger.info('[meta] request started, host: %s, user-agent: %s', this.host, this.header['user-agent']);
    }
    yield next;
    // total response time header
    this.set('x-readtime', Date.now() - this.starttime);
  };
};
