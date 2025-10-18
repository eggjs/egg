'use strict';

const path = require('path');

module.exports = function (appInfo) {
  const exports = {};

  exports.view = {
    root: ['app/view', 'app/ext-view'].map(p => path.join(appInfo.baseDir, p)).join(','),
    defaultViewEngine: 'nunjucks',
  };

  exports.keys = '123456';

  return exports;
};
