const fs = require('fs/promises');

module.exports = async ctx => {
  ctx.body = 'hello app';
  ctx.app.runInBackground(async function saveUserInfo(ctx) {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('mock background run at app result file size: %s', buf.length);
  });

  ctx.app.runInBackground(async ctx => {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('mock background run at app anonymous result file size: %s', buf.length);
  });
};
