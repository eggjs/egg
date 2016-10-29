'use strict';

const assert = require('assert');

module.exports = (options, app) => {
  return function* (next) {
    assert.deepEqual(options, app.config.hello);
    this.body = options.text;
    yield next;
  };
};
