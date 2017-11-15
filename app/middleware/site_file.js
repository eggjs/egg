'use strict';

const path = require('path');
const MAX_AGE = 'public, max-age=2592000'; // 30 days

module.exports = options => {
  return function siteFile(ctx, next) {
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return next();
    /* istanbul ignore if */
    if (ctx.path[0] !== '/') return next();

    const content = options[ctx.path];
    if (!content) return next();

    // '/favicon.ico': 'https://eggjs.org/favicon.ico',
    // content is url
    if (typeof content === 'string') return ctx.redirect(content);

    // '/robots.txt': Buffer <xx..
    // content is buffer
    if (Buffer.isBuffer(content)) {
      ctx.set('cache-control', MAX_AGE);
      ctx.body = content;
      ctx.type = path.extname(ctx.path);
      return;
    }

    return next();
  };
};
