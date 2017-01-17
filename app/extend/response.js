'use strict';

const getType = require('mime-types').contentType;
const jsonpBody = require('jsonp-body');
const isJSON = require('koa-is-json');
const REAL_STATUS = Symbol('Context#realStatus');

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

  /**
   * set jsonp response body
   * If client requests with `query[options.callback]`, it will return jsonp body
   * otherwise it will return json body
   *
   * Notice: you can't read `response.jsonp`, you can only get by `response.body`
   *
   * @member {Void} Response#jsonp
   * @param {Object} obj response object
   */
  set jsonp(obj) {
    const options = this.app.config.jsonp;
    const jsonpFunction = this.ctx.query[options.callback];
    if (!jsonpFunction) {
      this.body = obj;
    } else {
      this.set('x-content-type-options', 'nosniff');
      this.type = 'js';
      this.body = jsonpBody(obj, jsonpFunction, options);
    }
  },

  /**
   * read response real status code.
   *
   * e.g.: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Context#realStatus
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
