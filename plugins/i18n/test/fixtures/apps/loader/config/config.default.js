'use strict';

const path = require('path');

exports.keys = 'loader';
exports.i18n = {
  dirs: [path.join(__dirname, 'locales2')],
};
exports.view = {
  defaultViewEngine: 'nunjucks',
};
