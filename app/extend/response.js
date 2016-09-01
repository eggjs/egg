'use strict';

const getType = require('mime-types').contentType;

module.exports = {
  set length(n) {
    // copy from koa
    // change header name to lower case
    this.set('content-length', n);
  },

  set type(type) {
    // copy from koa
    // change header name to lower case
    type = getType(type) || false;
    if (type) {
      this.set('content-type', type);
    } else {
      this.remove('content-type');
    }
  },
};
