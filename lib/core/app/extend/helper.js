'use strict';

const path = require('path');

module.exports = {

  /**
   * 基于路由规则生成 URL（不带 host）。
   * @method Helper#pathFor
   * @param {String} name - Router Name
   * @param {Object} params - Other params
   *
   * @example
   * ```js
   * app.get('home', '/index.htm', 'home.index');
   * helper.pathFor('home', { by: 'recent', limit: 20 })
   * => /index.htm?by=recent&limit=20
   * ```
   * @return {String} 路由对应的相对路径
   */
  pathFor(name, params) {
    return this.app.router.url(name, params);
  },

  /**
   * 基于路由规则生成 URL，同时会包含 host 前缀。
   * @method Helper#urlFor
   * @param {String} name - Router name
   * @param {Object} params - Other params
   * @example
   * ```js
   * app.get('home', '/index.htm', 'home.index');
   * helper.pathFor('home', { by: 'recent', limit: 20 })
   * => http://127.0.0.1:7001/index.htm?by=recent&limit=20
   * ```
   * @return {String} 含有域名的完整 URL
   */
  urlFor(name, params) {
    return this.ctx.protocol + '://' + this.ctx.host + path.join('/', this.app.router.url(name, params));
  },

};
