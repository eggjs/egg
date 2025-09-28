const path = require('node:path');
const fs = require('node:fs');

// keep one generator function test case
module.exports = async function () {
  const parts = this.multipart();
  let part;
  while ((part = await parts()) != null) {
    if (Array.isArray(part)) {
      continue;
    } else {
      break;
    }
  }

  const ws = fs.createWriteStream(path.join(this.app.config.logger.dir, 'multipart-test-file'));
  part.pipe(ws);
  this.body = {
    filename: part.filename,
  };
};
