'use strict';

const path = require('path');

module.exports = {
  a: {
    enable: true,
    path: path.join(__dirname, '../a'),
  },
  b: {
    enable: true,
    path: path.join(__dirname, '../b'),
  },
  c: {
    enable: true,
    path: path.join(__dirname, '../c'),
  },
  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks',
  },
};
