'use strict';

const getType = require('mime-types').contentType;
const isJSON = require('koa-is-json');

module.exports = {
  set length(n) {
    // copy from koa
    // change header name to lower case
    this.set('content-length', n);
  },

  get length() {
    // copy from koa
    const len = this.header['content-length'];
    const body = this.body;

    if (len == null) {
      if (!body) return;
      if (typeof body === 'string') return Buffer.byteLength(body);
      if (Buffer.isBuffer(body)) return body.length;
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body));
      return;
    }

    return parseInt(len, 10);
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

  get type() {
    // copy from koa
    const type = this.get('content-type');
    if (!type) return '';
    return type.split(';')[0];
  },
};
