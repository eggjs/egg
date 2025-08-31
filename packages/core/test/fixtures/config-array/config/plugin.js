'use strict';

const path = require('path');

module.exports = {
  a: {
    enable: true,
    path: path.join(__dirname, '../plugin/a'),
  },
  b: {
    enable: true,
    path: path.join(__dirname, '../plugin/b'),
  },
};
