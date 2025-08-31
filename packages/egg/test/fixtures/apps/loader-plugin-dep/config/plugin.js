const path = require('path');

module.exports = {
  a: {
    enable: true,
    dependencies: ['b', 'f'],
    path: path.join(__dirname, '../plugins/a')
  },

  b: {
    enable: true,
    path: path.join(__dirname, '../plugins/b')
  },

  c1: {
    enable: true,
    dependencies: ['b'],
    path: path.join(__dirname, '../plugins/c')
  },

  d: {
    enable: true,
    dependencies: ['a'],
    path: path.join(__dirname, '../plugins/d')
  },

  e: {
    enable: true,
    dependencies: ['f'],
    path: path.join(__dirname, '../plugins/e')
  },

  f: {
    enable: true,
    dependencies: ['c1'],
    path: path.join(__dirname, '../plugins/f')
  },

};
