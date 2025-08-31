'use strict';

const path = require('path');

exports.a = false;

exports.b = {
  enable: true,
  path: path.join(__dirname, '../plugins/b'),
};
