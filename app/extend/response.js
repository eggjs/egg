'use strict';

const getType = require('mime-types').contentType;
const isJSON = require('koa-is-json');
const REAL_STATUS = Symbol('Context#realStatus');

module.exports = {
  /**
   * set length real status code.
   *
   * @param {Number} len The manual content length to be set.
   * Notice that the value MUST BE of a number, if it's NOT a number or NaN or Infinite or <= 0, it's ignored.
   * And if it's a float type, it will be cast to a fixed integer in decimal.
   */
  set length(len) {
    // copy from koa
    // change header name to lower case
    if(typeof len === "number" && !isNaN(len) && !isFinite(len) && len > 0){
      this.set('content-length', parseInt(len,10));
    }
  },
  /**
   * get the value of "content-length".
   *
   * @return {Number}
   * If 'content-length' is null or undefined or empty, just check the body of the response as the content length.
   * Otherwises it will return you the length of the content.
   */
  get length() {
    // copy from koa
    const len = this.header['content-length'];
    const body = this.body;

    if (!len || len.trim() === "") {
      if (!body) return undefined;
      if (typeof body === 'string') return Buffer.byteLength(body);
      if (Buffer.isBuffer(body)) return body.length;
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body));
    }
    return parseInt(len, 10);
  },
  /**
   * set the content-type's value.
   *
   * @param {String} type The content-type's value.
   */
  set type(type) {
    // copy from koa
    // change header name to lower case
    type = getType(type);
    if (type) {
      this.set('content-type', type);
    } else {
      this.remove('content-type');
    }
  },
  /**
   * get the content-type's value
   *
   * @return {String}
   * Return you the content-type (for multiple types seperated by `;`, ONLY the 1st returned).
   */
  get type() {
    // copy from koa
    const type = this.get('content-type');
    if (!type) return '';
    return type.split(';')[0];
  },

  /**
   * read response real status code.
   *
   * Notice: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Context#realStatus
   * @return {Number}
   * Get the real status code such as 200, ect.
   */
  get realStatus() {
    if (this[REAL_STATUS]) {
      return this[REAL_STATUS];
    }
    return this.status;
  },

  /**
   * set response real status code.
   *
   * @member {Void} Response#realStatus
   * @param {Number} status the real status code
   */
  set realStatus(status) {
    this[REAL_STATUS] = status;
  },
};
