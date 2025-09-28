'use strict';

const path = require('path');
const fs = require('fs');

module.exports = async ctx => {
  const parts = ctx.multipart();
  let part;
  while ((part = await parts()) != null) {
    if (Array.isArray(part)) {
      continue;
    } else {
      break;
    }
  }

  const ws = fs.createWriteStream(path.join(ctx.app.config.logger.dir, 'multipart-test-file'));
  part.pipe(ws);
  ctx.body = {
    filename: part.filename,
  };
};
