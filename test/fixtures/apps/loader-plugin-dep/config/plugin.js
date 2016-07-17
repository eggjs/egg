const path = require('path');

module.exports = {
  a: {
    enable: true,
    dep: ['b', 'f'],
    path: path.join(__dirname, '../plugins/a')
  },

  b: {
    enable: true,
    path: path.join(__dirname, '../plugins/b')
  },

  c1: {
    enable: true,
    dep: ['b'],
    path: path.join(__dirname, '../plugins/c')
  },

  d: {
    enable: true,
    dep: ['a'],
    path: path.join(__dirname, '../plugins/d')
  },

  e: {
    enable: true,
    dep: ['f'],
    path: path.join(__dirname, '../plugins/e')
  },

  f: {
    enable: true,
    dep: ['c1'],
    path: path.join(__dirname, '../plugins/f')
  },

};
