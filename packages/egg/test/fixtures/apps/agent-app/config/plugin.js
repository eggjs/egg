'use strict';

const path = require('path');

module.exports = {
  mock: {
    enable: true,
    path: path.join(__dirname, '../plugins/mock-client'),
  },
};
