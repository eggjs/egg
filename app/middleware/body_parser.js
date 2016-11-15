'use strict';

const bodyParser = require('koa-bodyparser');
const pathMatching = require('egg-path-matching');

module.exports = function(options) {
  const bodyParserMiddleware = bodyParser(options);
  const match = pathMatching(options);
  return function* (next) {
    if (!options.enable) return yield next;
    if (!match(this)) return yield next;

    return yield bodyParserMiddleware.call(this, next);
  };
};
