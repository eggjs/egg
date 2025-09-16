const path = require('path');

exports.onerror = {
  templatePath: path.join(__dirname, '../template.mustache'),
};

exports.logger = {
  level: 'NONE',
  consoleLevel: 'NONE',
};

exports.keys = 'foo,bar';

exports.security = {
  csrf: false,
};
