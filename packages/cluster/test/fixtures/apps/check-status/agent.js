'use strict';

const fs = require('fs');
const path = require('path');

module.exports = agent => {
  if (fs.existsSync(path.join(agent.baseDir, 'logs/started'))) {
    process.exit(1);
  }
  process.on('message', function(msg) {
    if (msg.action === 'kill') process.exit(1);
  });
};
