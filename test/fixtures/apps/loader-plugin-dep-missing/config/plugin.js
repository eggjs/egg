const path = require('path');

module.exports = {
  a: {
    enable: true,
    dep: ['b'],
    path: path.join(__dirname, '../plugins/a')
  },

  b: {
    enable: true,
    dep: ['c'],
    path: path.join(__dirname, '../plugins/b')
  },

  c: {
    enable: true,
    dep: ['a1'],
    path: path.join(__dirname, '../plugins/c')
  },

};
