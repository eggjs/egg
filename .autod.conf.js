'ues strict';

module.exports = {
  write: true,
  plugin: 'autod-egg',
  prefix: '^',
  devprefix: '^',
  exclude: [
    'test/fixtures',
    'examples',
    'benchmarks',
    "docs",
  ],
  devdep: [
    'autod',
    'autod-egg',
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
