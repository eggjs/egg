'use strict';

const path = require('path');
const fs = require('fs');

module.exports = function* () {
  var parts = this.multipart();
  var part;
  var fields = {};
  while (part = yield parts) {
    if (Array.isArray(part)) {
      fields[part[0]] = part[1];
      continue;
    } else {
      break;
    }
  }

  if (!part || !part.filename) {
    this.body = {
      message: 'no file',
    };
    return;
  }

  const ws = fs.createWriteStream(path.join(this.app.config.logger.dir, 'multipart-test-file'));
  part.pipe(ws);
  this.body = {
    filename: part.filename,
    fields,
  };
};
