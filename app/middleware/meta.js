/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = (_, app) => {
  const poweredBy = typeof app.poweredBy === 'string' ? app.poweredBy : null;

  return function* meta(next) {
    if (poweredBy) this.setRawHeader('X-Powered-By', poweredBy);

    yield next;

    // total response time header
    this.setRawHeader('X-Readtime', Date.now() - this.starttime);
  };
};
