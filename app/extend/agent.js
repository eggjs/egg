'use strict';

const Singleton = require('../../lib/core/singleton');

// 空的 instrument 返回，用于生产环境，避免每次创建对象
const emptyInstrument = {
  end() {},
};

module.exports = {

  /**
   * 创建一个单例并添加到 app/agent 上
   * @method Agent#addSingleton
   * @param {String} name 单例的唯一名字
   * @param {Object} create - 单例的创建方法
   */
  addSingleton(name, create) {
    const options = {};
    options.name = name;
    options.create = create;
    options.app = this;
    const singleton = new Singleton(options);
    singleton.init();
  },

  /**
   * 记录操作的时间
   * @method Agent#instrument
   * @param  {String} event 类型
   * @param  {String} action 具体操作
   * @return {Object} 对象包含 end 方法
   * @example
   * ```js
   * const ins = agent.instrument('http', `${method} ${url}`);
   * // doing
   * ins.end();
   * ```
   */
  instrument(event, action) {
    if (this.config.env !== 'local') {
      return emptyInstrument;
    }
    const payload = {
      start: Date.now(),
      agent: this,
      event,
      action,
    };

    return {
      end() {
        const start = payload.start;
        const duration = Date.now() - start;
        payload.agent.logger.info(`[${payload.event}] ${payload.action} ${duration}ms`);
      },
    };
  },
};
