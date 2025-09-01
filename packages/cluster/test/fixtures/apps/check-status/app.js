'use strict';

const fs = require('fs');
const path = require('path');

module.exports = app => {
  if (fs.existsSync(path.join(app.baseDir, 'logs/started'))) {
    process.exit(1);
  }
  process.on('message', function(msg) {
    if (msg.action === 'kill') process.exit(1);
  });
};
