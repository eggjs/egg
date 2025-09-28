'use strict';

const path = require('path');

module.exports = appInfo => ({
  keys: '123',
  view: {
    root: ['app/view1', 'app/view2'].map(view => path.join(appInfo.baseDir, view)).join(','),
    defaultViewEngine: 'nunjucks',
  },
});
