'ues strict';

module.exports = {
  write: true,
  plugin: 'autod-egg',
  prefix: '^',
  devprefix: '^',
  registry: 'https://r.cnpmjs.org',
  exclude: [
    'test/fixtures',
    'examples',
    'benchmarks',
    "docs",
  ],
  devdep: [
    'autod',
    'autod-egg',
    'eslint',
    'egg-plugin-puml',
    'nunjucks',
    'koa',
    'koa-router',
    'toa',
    'toa-router',
  ],
  keep: [
  ],
  semver: [
    'koa@1',
  ],
};
