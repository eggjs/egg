'use strict';

const path = require('path');

require('../../../../index').startCluster({
  baseDir: __dirname,
  eggPath: path.dirname(require.resolve('@ali/egg')),
  workers: 1,
});

// 循环出错说明 master 没有挂
setTimeout(function() {
  process.exit();
// coverage 会比较慢
}, 5000);
