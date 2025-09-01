'use strict';

const path = require('path');

module.exports = app => {
  return {
    keys: '123',
    cluster: {
      listen: {
        path: path.join(app.baseDir, 'my.sock'),
      },
    },
  };
};
