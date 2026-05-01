'use strict';

const path = require('path');

module.exports = (app) => {
  return {
    keys: '123',
    cluster: {
      listen: {
        path: process.env.EGG_APP_LISTEN_PATH_SOCKET || path.join(app.baseDir, 'my.sock'),
      },
    },
  };
};
