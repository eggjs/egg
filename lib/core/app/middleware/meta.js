/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = () => {
  let serverId = process.env.HOSTNAME || '';
  if (serverId.indexOf('-') > 0) {
    // appname-1-1 => 1-1
    serverId = serverId.split('-').slice(1).join('-');
  }

  return function* meta(next) {
   /**
    * Request start time
    * @member {Number} Context#starttime
    */
    this.starttime = Date.now();

    yield* next;

    if (typeof this.app.poweredBy === 'string') {
      this.set('X-Powered-By', this.app.poweredBy);
    }

    if (serverId) {
      this.set('X-Server-Id', serverId);
    }

    // total response time header
    this.set('X-Readtime', Date.now() - this.starttime);
  };
};
