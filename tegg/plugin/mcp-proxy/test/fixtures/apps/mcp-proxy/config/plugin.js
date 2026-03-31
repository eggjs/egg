'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggConfig = {
  package: '@eggjs/tegg-config',
  enable: true,
};

exports.mcpProxy = {
  enable: true,
  path: path.join(__dirname, '../../../../../'),
};

exports.watcher = false;
