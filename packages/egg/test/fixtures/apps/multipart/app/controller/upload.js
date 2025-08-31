const path = require('path');
const fs = require('fs');

module.exports = async function () {
  const parts = this.multipart();
  let filePart;
  const fields = {};
  for await (const part of parts) {
    filePart = part;
    if (Array.isArray(part)) {
      fields[part[0]] = part[1];
      continue;
    } else {
      break;
    }
  }

  if (!filePart || !filePart.filename) {
    this.body = {
      message: 'no file',
    };
    return;
  }

  const ws = fs.createWriteStream(path.join(this.app.config.logger.dir, 'multipart-test-file'));
  filePart.pipe(ws);
  this.body = {
    filename: filePart.filename,
    fields,
  };
};
