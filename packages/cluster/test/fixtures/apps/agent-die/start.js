'use strict';

const path = require('path');

require('../../../../index').startCluster({
  baseDir: __dirname,
  eggPath: path.dirname(require.resolve('@ali/egg')),
  workers: 1,
});
