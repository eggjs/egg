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
    "docs",
  ],
  devdep: [
    'autod',
    'autod-egg',
    'eslint',
    'eslint-config-egg',
    'egg-bin',
    'egg-plugin-puml',
    'egg-view-nunjucks',
  ],
  keep: [
  ],
  semver: [
  ],
  test: 'scripts',
};
