'use strict';

const path = require('path');

exports.keys = '123';

exports.cluster = {
  https: {
    key: path.join(__dirname, '../../../server.key'),
    cert: path.join(__dirname, '../../../server.cert'),
    ca: path.join(__dirname, '../../../server.ca'),
  },
};
