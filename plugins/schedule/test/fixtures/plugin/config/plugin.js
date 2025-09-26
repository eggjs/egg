'use strict';

const path = require('path');

exports.customPlugin = {
  enable: true,
  path: path.join(__dirname, '../plugin'),
};
