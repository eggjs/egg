'use strict';

module.exports = function(ViewClass) {

  /**
   * 封装 view 的通用逻辑, 继承于框架提供的 View 类
   *
   * 框架的 view 插件, 需要提供 render 和 renderString 的实现, 并注入到 Application
   *
   * @class Application#View
   *
   * @example
   * ```js
   * // lib/xx.js
   * const egg = require('egg');
   *
   * class NunjucksView {
   *   render(name, locals) {
   *     return Promise.resolve('some html');
   *   }
   *
   *   renderString(tpl, locals) {
   *     return Promise.resolve('some html');
   *   }
   *
   *   // view.helper 将注入到 locals.helper 上, 需 view 插件如下设置 getter
   *   get helper() {
   *     return this.ctx.helper;
   *   }
   * }
   *
   * class XxApplication extends egg.Application {
   *   get [Symbol.for('egg#view')]() {
   *     return NunjucksView;
   *   }
   * }
   * ```
   */
  class View extends ViewClass {
    constructor(ctx) {
      super(ctx);
      this.ctx = ctx;
      this.app = ctx.app;
    }

    /**
     * 渲染页面模板，返回渲染后的字符串
     * @method View#render
     * @param {String} name 模板文件名
     * @param {Object} [locals] 需要放到页面上的变量
     * @return {Promise} 渲染结果
     */
    render(name, locals) {
      locals = this.setLocals(locals);
      return super.render(name, locals);
    }

    /**
     * 渲染模板字符串
     * @method View#renderString
     * @param {String} tpl 模板字符串
     * @param {Object} [locals] 需要放到页面上的变量
     * @return {Promise} 渲染结果
     */
    renderString(tpl, locals) {
      locals = this.setLocals(locals);
      return super.renderString(tpl, locals);
    }

    /**
     * 设置 locals, 合并 ctx.locals, 并注入 ctx/helper/request
     * @param {Object} locals 数据对象
     * @return {Object} 返回新的 locals, 并不会修改入参对象
     * @private
     */
    setLocals(locals) {
      return Object.assign({}, {
        ctx: this.ctx,
        request: this.ctx.request,
        helper: this.helper,
      }, this.ctx.locals, locals);
    }
  }

  return View;
};
