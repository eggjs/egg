const path = require('path');

module.exports = {
  a: {
    enable: true,
    path: path.join(__dirname, '../plugins/a'),
  },

  b: {
    enable: false,
    path: path.join(__dirname, '../plugins/b'),
  },

  c: {
    enable: false,
    path: path.join(__dirname, '../plugins/c'),
  },

  d: {
    enable: true,
    path: path.join(__dirname, '../plugins/d'),
  },

  e: {
    enable: true,
    path: path.join(__dirname, '../plugins/e'),
  },
};
