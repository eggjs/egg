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
  ],
  devdep: [
    'autod',
    'autod-egg',
    'nunjucks',
    'koa',
  ],
  keep: [
  ],
  semver: [
    'koa@1',
  ],
};
