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
  keep: [
  ],
  semver: [
    'koa-bodyparser@2',
  ],
  test: 'scripts',
};
