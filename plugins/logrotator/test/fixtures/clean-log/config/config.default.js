'use strict';

const path = require('path');

module.exports = {
  customLogger: {
    bizLogger: {
      file: path.join(__dirname, '../logs', 'mybiz', 'biz.log'),
      consoleLevel: 'NONE',
    },
  },
};
