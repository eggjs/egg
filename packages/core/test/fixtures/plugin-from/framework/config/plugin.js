'use strict';

const path = require('path');

module.exports = {
  a: {
    enable: false,
    path: path.join(__dirname, '../../a'),
  },
  b: {
    enable: true,
    path: path.join(__dirname, '../../b'),
  },
};
