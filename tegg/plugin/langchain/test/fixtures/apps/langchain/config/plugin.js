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

exports.teggLangChain = {
  enable: true,
  path: path.join(__dirname, '../../../../../'),
};

exports.teggController = {
  package: '@eggjs/tegg-controller-plugin',
  enable: true,
};

exports.teggMcpClient = {
  enable: true,
  package: '@eggjs/tegg-mcp-client',
};

exports.tracer = {
  package: 'egg-tracer',
  enable: true,
};

exports.watcher = false;
