'use strict';

const path = require('path');

module.exports = (app) => {
  return {
    keys: '123',
    cluster: {
      listen: {
        path: process.env.EGG_CLUSTER_LISTEN_PATH || path.join(app.baseDir, 'my.sock'),
      },
    },
  };
};
