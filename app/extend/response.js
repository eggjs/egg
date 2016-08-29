'use strict';

module.exports = {
  /**
   * 不做任何检查直接设置 header
   * 你必须明确知道你在做什么，调用该方法前请先阅读 res.setHeader 源码
   * https://github.com/nodejs/node/blob/v4.5.0/lib/_http_outgoing.js#L338
   *
   * @param {String} name - header name
   * @param {String|Array} value - header value
   */
  setRawHeader(name, value) {
    if (this.res._headers === null) this.res._headers = {};
    this.res._headers[name] = value;
    this.res._headerNames[name] = name;
  },
};
