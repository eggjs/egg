'use strict';

module.exports = {
  write: true,
  plugin: 'autod-egg',
  prefix: '^',
  devprefix: '^',
  exclude: [
    'test/fixtures',
    'examples',
    'docs',
    'run',
  ],
  devdep: [
    'autod',
    'autod-egg',
    'eslint',
    'eslint-config-egg',
    'egg-bin',
    'egg-doctools',
    'egg-plugin-puml',
    'egg-view-nunjucks',
  ],
  dep: [
    '@types/accepts',
    '@types/koa',
    '@types/koa-router',
  ],
  test: 'scripts',
};
