'use strict';

const path = require('path');

module.exports = {
  // 插件简写
  a: false,

  a1: true,

  // 标准写法
  b: {
    enable: true
  },

  // 会自动补全信息
  c: {},

  // 别名，app.plugins.d1
  d1: {
    package: 'd'
  },

  e: {
    path: path.join(__dirname, '../plugins/e')
  },

  f: {
    path: path.join(__dirname, '../plugins/f')
  },

  g: {
    path: path.join(__dirname, '../plugins/g')
  },

  // 覆盖内置的
  rds: {
    enable: true,
    dependencies: ['session'],
    package: 'rds',
  },
};
