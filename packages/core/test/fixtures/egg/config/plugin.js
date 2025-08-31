'use strict';

const path = require('path');

module.exports = {
  session: {
    enable: true,
    path: path.join(__dirname, '../node_modules/session'),
  },

  hsfclient: {
    enable: false,
    path: path.join(__dirname, '../plugins/hsfclient'),
  },

  configclient: {
    enable: false,
    path: path.join(__dirname, '../plugins/configclient'),
  },

  eagleeye: {
    enable: false,
    path: path.join(__dirname, '../plugins/eagleeye'),
  },

  diamond: {
    enable: false,
    path: path.join(__dirname, '../plugins/diamond'),
  },

  zzz: {
    enable: true,
    path: path.join(__dirname, '../plugins/zzz'),
  },

  package: {
    enable: true,
    package: 'package',
  },

  opt: {
    enable: false,
    package: 'opt',
  },
};
