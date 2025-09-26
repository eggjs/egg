const path = require('path');

module.exports = appInfo => {
  return {
    keys: 'aaa',
    static: {
      prefix: '/public',
      dirs: [
        path.join(appInfo.baseDir, '/app/public'),
        {
          prefix: '/static',
          dir: path.join(appInfo.baseDir, '/dist/static'),
        },
      ],
      buffer: true,
    },
  };
};
