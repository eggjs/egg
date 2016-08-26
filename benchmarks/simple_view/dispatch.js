'use strict';

const egg = require('../..');

egg.startCluster({
  workers: Number(process.argv[2] || require('os').cpus().length),
  baseDir: __dirname,
});
