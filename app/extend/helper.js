'use strict';

const url = require('url');


module.exports = {

  /**
   * Generate URL path(without host) for route. Takes the route name and a map of named params.
   * @method Helper#pathFor
   * @param {String} name - Router Name
   * @param {Object} params - Other params
   *
   * @example
   * ```js
   * app.get('home', '/index.htm', 'home.index');
   * ctx.helper.pathFor('home', { by: 'recent', limit: 20 })
   * => /index.htm?by=recent&limit=20
   * ```
   * @return {String} url path(without host)
   */
  pathFor(name, params) {
    return this.app.router.url(name, params);
  },

  /**
   * Generate full URL(with host) for route. Takes the route name and a map of named params.
   * @method Helper#urlFor
   * @param {String} name - Router name
   * @param {Object} params - Other params
   * @example
   * ```js
   * app.get('home', '/index.htm', 'home.index');
   * ctx.helper.urlFor('home', { by: 'recent', limit: 20 })
   * => http://127.0.0.1:7001/index.htm?by=recent&limit=20
   * ```
   * @return {String} full url(with host)
   */
  urlFor(name, params) {
    return this.ctx.protocol + '://' + this.ctx.host + url.resolve('/', this.app.router.url(name, params));
  },

};
