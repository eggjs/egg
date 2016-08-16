'ues strict';

module.exports = {
  write: true,
  plugin: 'autod-egg',
  prefix: '^',
  devprefix: '^',
  exclude: [
    'test/fixtures',
    'examples',
  ],
  devdep: [
    'autod',
    'autod-egg'
  ],
  keep: [
  ],
  semver: [
  ],
};
