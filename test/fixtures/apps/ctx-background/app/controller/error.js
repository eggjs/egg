const fs = require('fs/promises');

module.exports = async ctx => {
  ctx.body = 'hello error';
  ctx.runInBackground(async function mockError(ctx) {
    const buf = await fs.readFile(__filename + '-not-exists');
    ctx.logger.warn('background run result file size: %s', buf.length);
  });
};
