'use strict';

const egg = require('../..');

egg.startCluster({
  workers: Number(process.argv[2] || 1),
  baseDir: __dirname,
});
