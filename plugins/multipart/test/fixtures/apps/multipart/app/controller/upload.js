const path = require('node:path');
const fs = require('node:fs');
const { sendToWormhole } = require('stream-wormhole');

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

  if (!part || !part.filename) {
    ctx.body = {
      message: 'no file',
    };
    return;
  }

  if (ctx.query.mock_stream_error) {
    // mock save stream error
    const filepath = path.join(ctx.app.config.logger.dir, 'not-exists-dir/dir2/testfile');
    try {
      await saveStream(part, filepath);
    } catch (err) {
      await sendToWormhole(part);
      throw err;
    }

    ctx.body = {
      filename: part.filename,
    };
  }

  if (ctx.query.mock_undefined_error) {
    part.foo();
  }

  const filepath = path.join(ctx.app.config.logger.dir, 'multipart-test-file');
  await saveStream(part, filepath);
  ctx.body = {
    filename: part.filename,
  };
};

function saveStream(stream, filepath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filepath);
    stream.pipe(ws);
    ws.on('error', reject);
    ws.on('finish', resolve);
  });
}
