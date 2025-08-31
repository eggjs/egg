'use strict';

const path = require('path');

module.exports = {
  session: {
    path: path.join(__dirname, '../session'),
  },
  hsfclient: {
    package: 'hsfclient',
  },
};
