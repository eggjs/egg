'use strict';

const path = require('path');

module.exports = {
  customA: {
    enable: true,
    path: path.join(__dirname, '../plugins/a'),
  },

  customB: {
    enable: false,
    package: '@ali/b',
  },
};
