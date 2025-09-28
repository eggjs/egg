'use strict';

const path = require('path');

module.exports = appInfo => {
  const root = [path.join(appInfo.baseDir, 'app/view'), path.join(appInfo.baseDir, 'app/view2')];
  return {
    keys: '123',
    view: {
      root: root.join(', '),
      defaultExtension: '.ejs',
      mapping: {
        '.ejs': 'ejs',
        '.nj': 'nunjucks',
        '.async': 'async',
        '.html': 'html',
      },
    },
  };
};
