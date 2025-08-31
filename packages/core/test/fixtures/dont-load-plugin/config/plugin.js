const path = require('path');

exports.testMe = {
  enable: true,
  env: ['local'],
  path: path.join(__dirname, '../../../plugins/test-me'),
};

exports.testMeAli = {
  enable: true,
  path: path.join(__dirname, '../../../plugins/test-me-ali'),
};
