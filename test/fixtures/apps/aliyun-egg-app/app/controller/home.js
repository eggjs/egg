'use strict';

module.exports = function*() {
  this.body = {
    'aliyun-egg-core': !!this.app['aliyun-egg'],
    'aliyun-egg-plugin': !!this.app.custom,
    'aliyun-egg-agent': !!this.app.agent,
  }
};
