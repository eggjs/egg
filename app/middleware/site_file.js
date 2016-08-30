'use strict';

const path = require('path');
const MAX_AGE = 'public, max-age=2592000'; // 30 days

module.exports = options => {
  return function* siteFile(next) {
    if (this.method !== 'HEAD' && this.method !== 'GET') return yield next;

    if (!options.hasOwnProperty(this.path)) return yield next;

    const content = options[this.path];

    // '/favicon.ico': 'https://eggjs.org/favicon.ico',
    // content is url
    if (typeof content === 'string') return this.redirect(content);

    // '/robots.txt': Buffer <xx..
    // content is buffer
    if (Buffer.isBuffer(content)) {
      this.set('cache-control', MAX_AGE);
      this.body = content;
      this.type = path.extname(this.path);
      return;
    }

    yield next;
  };
};
