'use strict';

const utils = require('../../../utils');

require('../../../../index').startCluster({
  baseDir: __dirname,
  workers: 1
})

setTimeout(() => {
  process.exit();
// coverage will be slow
}, 5000);
