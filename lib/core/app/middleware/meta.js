/**
 * meta 中间件，放在最前面
 */

'use strict';

module.exports = function() {
  let serverId = process.env.HOSTNAME || '';
  if (serverId.indexOf('-') > 0) {
    // appname-90-1 => 90-1
    serverId = serverId.split('-').slice(1).join('-');
  }

  return function* (next) {
   /**
    * 开始处理当前请求的时间戳，单位 `ms`，方便做一些时间计算。
    * @member {Number} Context#starttime
    */
    this.starttime = Date.now();

    yield* next;

    if (typeof this.app.poweredBy === 'string') {
      this.set('X-Powered-By', this.app.poweredBy);
    }

    if (serverId) {
      this.set('X-Server-Id', serverId);
    }

    // 设置一个 x-readtime 头, 供 nginx access log 使用, 也方便调试
    this.set('X-Readtime', Date.now() - this.starttime);
  };
};
