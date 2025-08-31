'use strict';

const address = require('address');

exports.keys = 'my keys';
exports.cluster = {
  listen: {
    hostname: address.ip(),
  },
};
