'use strict';

const address = require('address');


module.exports = {
  keys: '123',
  cluster: {
    listen: {
      port: 17010,
      hostname: address.ip(),
    },
  },
};
