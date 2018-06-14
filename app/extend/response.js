'use strict';

const contentType = require('mime-types').contentType;
const isJSON = require('koa-is-json');
const LRU = require('ylru');

const REAL_STATUS = Symbol('Context#realStatus');

const typeLRUCache = new LRU(100);
function getType(type) {
  let mimeType = typeLRUCache.get(type);
  if (!mimeType) {
    mimeType = contentType(type);
    typeLRUCache.set(type, mimeType);
  }
  return mimeType;
}

module.exports = {

  /**
   * Get or set the length of content.
   *
   * For Get: If the original content length is null or undefined, it will read out
   * the body's content length as the return value.
   *
   * @member {Number} Response#type
   * @param {Number} len The content-length to be set.
   */
  set length(len) {
    // copy from koa
    // change header name to lower case
    this.set('content-length', len);
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

  /**
   * Get or set the content-type.
   *
   * For Set: If type is null or undefined, this property will be removed.
   *
   * For Get: If the value is null or undefined, an empty string will be returned;
   * if you have multiple values seperated by `;`, ONLY the first one will be returned.
   *
   * @member {String} Response#type
   * @param {String} type The content-type to be set.
   */
  set type(type) {
    // copy from koa
    // Different:
    //  - change header name to lower case
    //  - improve mimeType detect by local lru cache
    type = getType(type);
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

  /**
   * Get or set a real status code.
   *
   * e.g.: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Response#realStatus
   * @param {Number} status The status code to be set.
   */
  get realStatus() {
    if (this[REAL_STATUS]) {
      return this[REAL_STATUS];
    }
    return this.status;
  },

  set realStatus(status) {
    this[REAL_STATUS] = status;
  },
};
