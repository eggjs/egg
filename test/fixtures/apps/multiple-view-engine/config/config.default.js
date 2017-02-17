'use strict';

const path = require('path');

module.exports = appInfo => {
  const root = [
    path.join(appInfo.baseDir, 'app/view'),
    path.join(appInfo.baseDir, 'app/view2'),
  ];
  return {
    view: {
      root: root.join(', '),
      defaultExt: '.ejs',
      mapping: {
        '.ejs': 'ejs',
        '.nj': 'nunjucks',
        '.html': 'html',
      },
    },
  }
};
