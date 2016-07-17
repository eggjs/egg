/**
 * Service, service 基类，封装 service 的通用逻辑
 */

'use strict';

/**
 * service 基类，封装 service 的通用逻辑。
 * 你可以通过继承此基类来编写 service
 * @example
 * ```js
 * // app/service/user.js
 * const Service = require('egg').Service;
 *
 * class User extends Service {
 *   constructor(ctx) {
 *     super(ctx);
 *     // 你的业务逻辑
 *   }
 *
 *   * findUser(uid) {
 *     return findUserFromDB();
 *   }
 *
 *   // 更多其他方法
 * }
 * ```
 */
class Service {

  /**
   * @constructor
   * @param  {Context} ctx 上下文
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

}

module.exports = Service;
