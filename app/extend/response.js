'use strict';

const getType = require('mime-types').contentType;
const jsonpBody = require('jsonp-body');
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

  /**
   * 设置 jsonp 的内容，将会以 jsonp 的方式返回。注意：不可读。
   * @member {Void} Context#jsonp
   * @param {Object} obj 设置的对象
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
};
