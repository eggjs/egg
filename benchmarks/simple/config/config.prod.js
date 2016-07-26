'use strict';

const path = require('path');

exports.keys = 'foo';

exports.logger = {
  dir: path.join(__dirname, '../logs'),
};
