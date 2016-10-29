'use strict';

const assert = require('assert');

module.exports = function(options, app) {
  return function* (next) {
    assert.deepEqual(options, app.config.hello);
    this.body = options.text;
    yield next;
  };
};
