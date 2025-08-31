const path = require('path');

module.exports = {
  a: {
    enable: true,
    dependencies: ['b'],
    path: path.join(__dirname, '../plugins/a')
  },

  b: {
    enable: true,
    dependencies: ['c'],
    path: path.join(__dirname, '../plugins/b')
  },

  c: {
    enable: true,
    dependencies: ['a1'],
    path: path.join(__dirname, '../plugins/c')
  },

};
