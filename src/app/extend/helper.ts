import url from 'node:url';
import { BaseContextClass } from '../../lib/core/base_context_class.js';

/**
 * The Helper class which can be used as utility function.
 * We support developers to extend Helper through ${baseDir}/app/extend/helper.js ,
 * then you can use all method on `ctx.helper` that is a instance of Helper.
 */
export default class Helper extends BaseContextClass {
  /**
   * Generate URL path(without host) for route. Takes the route name and a map of named params.
   * @function Helper#pathFor
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
  pathFor(name: string, params: Record<string, any>): string {
    return this.app.router.url(name, params);
  }

  /**
   * Generate full URL(with host) for route. Takes the route name and a map of named params.
   * @function Helper#urlFor
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
  urlFor(name: string, params: Record<string, any>): string {
    return this.ctx.protocol + '://' + this.ctx.host + url.resolve('/', this.pathFor(name, params));
  }
}
