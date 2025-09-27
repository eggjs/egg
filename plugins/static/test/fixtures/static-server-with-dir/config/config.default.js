const path = require('path');

module.exports = appInfo => {
  return {
    keys: 'aaa',
    static: {
      prefix: '/public',
      dir: [path.join(appInfo.baseDir, '/app/public'), path.join(appInfo.baseDir, '/dist/static')],
      buffer: true,
    },
  };
};
