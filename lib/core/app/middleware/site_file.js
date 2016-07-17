'use strict';

// favicon.ico crossdomain.xml robots.txt support

const path = require('path');
const MAX_AGE = 30 * 24 * 68 * 60;

module.exports = function fixture(options) {
  return function* (next) {
    if (this.method !== 'HEAD' && this.method !== 'GET') return yield next;

    if (!options.hasOwnProperty(this.path)) return yield next;

    const content = options[this.path];

    // '/favicon.ico': 'https://eggjs.org/favicon.ico',
    // content is url
    if (typeof content === 'string') return this.redirect(content);

    // '/robots.txt': Buffer <xx..
    // content is buffer
    if (Buffer.isBuffer(content)) {
      this.set('Cache-Control', `public, max-age=${MAX_AGE}`);
      this.body = content;
      this.type = path.extname(this.path);
      return;
    }

    yield next;
  };
};
