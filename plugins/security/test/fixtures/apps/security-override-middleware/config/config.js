'use strict';

exports.keys = 'test key';

// 自定义中间件
exports.middleware = ['override'];

exports.security = {
  hsts: {
    enable: true,
  },
};
